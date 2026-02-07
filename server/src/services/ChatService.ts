import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export interface ChatEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolInput?: object;
  toolOutput?: string;
  isError?: boolean;
}

export class ChatService extends EventEmitter {
  private process: ChildProcess | null = null;
  private projectPath: string;
  private buffer: string = '';
  private sessionId?: string;

  constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
  }

  async start(sessionId?: string): Promise<void> {
    this.sessionId = sessionId;
    // Don't start a process yet - we'll spawn one per message
    this.emit('event', { type: 'text', content: 'Ready to chat. Send a message to begin.' } as ChatEvent);
    this.emit('event', { type: 'done' } as ChatEvent);
  }

  private runMessage(message: string): void {
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      '--permission-mode', 'default',
    ];
    if (this.sessionId) {
      args.push('--resume', this.sessionId);
    }
    args.push('--', message);

    console.log('Spawning claude with expect wrapper, args:', args);
    console.log('Working directory:', this.projectPath);

    // Create minimal environment to avoid Claude Code SDK interference
    const cleanEnv: Record<string, string> = {
      PATH: process.env.PATH || '/usr/bin:/bin:/opt/homebrew/bin',
      HOME: process.env.HOME || '',
      USER: process.env.USER || '',
      SHELL: process.env.SHELL || '/bin/bash',
      TERM: 'xterm-256color',
      FORCE_COLOR: '0',
    };

    // Escape message for expect/shell
    const escapedMessage = message.replace(/'/g, "'\\''");
    const escapedArgs = args.map(arg => {
      if (arg === message) {
        return `'${escapedMessage}'`;
      }
      return arg.includes(' ') ? `'${arg}'` : arg;
    }).join(' ');

    // Use expect to provide a PTY for claude
    const expectScript = `
spawn -noecho env -i PATH=${cleanEnv.PATH} HOME=${cleanEnv.HOME} USER=${cleanEnv.USER} TERM=xterm-256color FORCE_COLOR=0 claude ${escapedArgs}
set timeout 300
expect {
    timeout { exit 1 }
    eof
}
`;

    console.log('Process PATH:', process.env.PATH);
    this.process = spawn('/usr/bin/expect', ['-c', expectScript], {
      cwd: this.projectPath,
      env: { ...process.env, ...cleanEnv },
    });

    this.process.stdout?.on('data', (chunk: Buffer) => {
      const output = chunk.toString();
      console.log('Claude stdout chunk:', output.substring(0, 200));
      this.handleOutput(output);
    });

    this.process.stderr?.on('data', (chunk: Buffer) => {
      const errMsg = chunk.toString();
      console.error('Claude stderr:', errMsg);
      // Don't emit non-critical stderr as errors
      if (errMsg.includes('Error') || errMsg.includes('error')) {
        this.emit('event', { type: 'error', content: errMsg } as ChatEvent);
      }
    });

    this.process.on('exit', (code) => {
      console.log('Expect process exited with code:', code);
      // Flush any remaining buffer
      if (this.buffer.trim()) {
        try {
          const parsed = JSON.parse(this.buffer);
          this.emit('event', this.parseStreamEvent(parsed));
        } catch {
          if (this.buffer.trim()) {
            this.emit('event', { type: 'text', content: this.buffer } as ChatEvent);
          }
        }
        this.buffer = '';
      }
      this.emit('event', { type: 'done' } as ChatEvent);
      this.process = null;
    });

    this.process.on('error', (err) => {
      console.error('Process error:', err);
      this.emit('event', { type: 'error', content: err.message } as ChatEvent);
    });
  }

  private handleOutput(data: string): void {
    // Buffer incomplete JSON lines
    this.buffer += data;
    const lines = this.buffer.split('\n');

    // Keep the last incomplete line in buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // Skip ANSI escape sequences and control characters
      const cleanLine = trimmedLine
        .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')  // ANSI escape sequences
        .replace(/\x1B\][^\x07]*\x07/g, '')      // OSC sequences
        .replace(/\[\?[0-9]+[hlm]/g, '')         // Terminal modes
        .replace(/\[<u/g, '')                    // Control sequences
        .trim();
      if (!cleanLine) continue;

      try {
        const parsed = JSON.parse(cleanLine);
        const event = this.parseStreamEvent(parsed);
        if (event.content) {  // Only emit non-empty events
          this.emit('event', event);
        }
      } catch {
        // Not JSON - might be plain text response
        if (cleanLine.length > 0 && !cleanLine.startsWith('{')) {
          this.emit('event', { type: 'text', content: cleanLine } as ChatEvent);
        }
      }
    }
  }

  private parseStreamEvent(data: any): ChatEvent {
    // Handle different stream-json output formats
    if (data.type === 'content_block_delta') {
      if (data.delta?.type === 'text_delta') {
        return { type: 'text', content: data.delta.text };
      }
      if (data.delta?.type === 'thinking_delta') {
        return { type: 'thinking', content: data.delta.thinking };
      }
    }

    if (data.type === 'content_block_start') {
      if (data.content_block?.type === 'tool_use') {
        return {
          type: 'tool_use',
          toolName: data.content_block.name,
          toolInput: data.content_block.input,
        };
      }
    }

    if (data.type === 'tool_result') {
      return {
        type: 'tool_result',
        toolOutput: data.content,
        isError: data.is_error,
      };
    }

    if (data.type === 'message_stop') {
      return { type: 'done' };
    }

    // Handle 'result' type which contains the final response
    if (data.type === 'result' && data.result) {
      return { type: 'text', content: data.result };
    }

    // Handle 'assistant' type messages
    if (data.type === 'assistant' && data.message?.content) {
      const content = data.message.content;
      if (Array.isArray(content)) {
        const textContent = content.find((c: any) => c.type === 'text');
        if (textContent?.text) {
          return { type: 'text', content: textContent.text };
        }
      }
    }

    // Fallback: emit as text if we have content
    if (data.content || data.text) {
      return { type: 'text', content: data.content || data.text };
    }

    // Skip system and hook messages
    if (data.type === 'system' || data.subtype?.includes('hook')) {
      return { type: 'text', content: '' };  // Empty text will be filtered
    }

    return { type: 'text', content: '' };  // Don't output raw JSON
  }

  send(message: string): void {
    if (this.process) {
      this.emit('event', { type: 'error', content: 'Already processing a message' } as ChatEvent);
      return;
    }
    this.runMessage(message);
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  isRunning(): boolean {
    return this.process !== null;
  }
}
