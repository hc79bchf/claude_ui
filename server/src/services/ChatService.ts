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

  constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
  }

  async start(sessionId?: string): Promise<void> {
    const args = ['--print', '--output-format', 'stream-json'];
    if (sessionId) {
      args.push('--resume', sessionId);
    }

    this.process = spawn('claude', args, {
      cwd: this.projectPath,
      env: { ...process.env, FORCE_COLOR: '0' },
      shell: true,
    });

    this.process.stdout?.on('data', (chunk: Buffer) => {
      this.handleOutput(chunk.toString());
    });

    this.process.stderr?.on('data', (chunk: Buffer) => {
      this.emit('event', { type: 'error', content: chunk.toString() } as ChatEvent);
    });

    this.process.on('exit', (code) => {
      this.emit('exit', code);
      this.process = null;
    });

    this.process.on('error', (err) => {
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
      if (!line.trim()) continue;

      try {
        const parsed = JSON.parse(line);
        this.emit('event', this.parseStreamEvent(parsed));
      } catch {
        // Not JSON, emit as text
        this.emit('event', { type: 'text', content: line } as ChatEvent);
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

    // Fallback: emit as text if we have content
    if (data.content || data.text) {
      return { type: 'text', content: data.content || data.text };
    }

    return { type: 'text', content: JSON.stringify(data) };
  }

  send(message: string): void {
    if (!this.process?.stdin) {
      this.emit('event', { type: 'error', content: 'Chat process not running' } as ChatEvent);
      return;
    }
    this.process.stdin.write(message + '\n');
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
