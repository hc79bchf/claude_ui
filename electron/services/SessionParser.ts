import * as fs from 'fs';
import * as path from 'path';
import { RawSessionMessage, ParsedSession } from './types';

export class SessionParser {
  parseSessionFile(filePath: string): ParsedSession | null {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      if (lines.length === 0) return null;

      const messages: RawSessionMessage[] = lines.map(line => JSON.parse(line));

      const firstMsg = messages[0];
      const lastMsg = messages[messages.length - 1];

      // Aggregate stats
      let inputTokens = 0;
      let outputTokens = 0;
      let cacheRead = 0;
      let cacheCreation = 0;
      const toolsUsed: Record<string, number> = {};
      const skillsUsed: Record<string, number> = {};
      let model = 'unknown';
      let messageCount = 0;

      for (const msg of messages) {
        if (msg.message?.usage) {
          inputTokens += msg.message.usage.input_tokens || 0;
          outputTokens += msg.message.usage.output_tokens || 0;
          cacheRead += msg.message.usage.cache_read_input_tokens || 0;
          cacheCreation += msg.message.usage.cache_creation_input_tokens || 0;
        }

        if (msg.message?.model) {
          model = msg.message.model;
        }

        if (msg.message?.role) {
          messageCount++;
        }

        // Track tool usage
        if (msg.message?.content) {
          for (const block of msg.message.content) {
            if (block.type === 'tool_use' && block.name) {
              toolsUsed[block.name] = (toolsUsed[block.name] || 0) + 1;

              // Track skill invocations
              if (block.name === 'Skill' && block.input) {
                const skillName = (block.input as { skill?: string }).skill;
                if (skillName) {
                  skillsUsed[skillName] = (skillsUsed[skillName] || 0) + 1;
                }
              }
            }
          }
        }
      }

      return {
        id: firstMsg.sessionId,
        slug: firstMsg.slug || path.basename(filePath, '.jsonl'),
        projectPath: firstMsg.cwd,
        gitBranch: firstMsg.gitBranch || 'unknown',
        startedAt: firstMsg.timestamp,
        lastActivityAt: lastMsg.timestamp,
        messageCount,
        tokenUsage: {
          input: inputTokens,
          output: outputTokens,
          cacheRead,
          cacheCreation,
        },
        toolsUsed,
        skillsUsed,
        model,
      };
    } catch (error) {
      console.error(`Error parsing session file ${filePath}:`, error);
      return null;
    }
  }

  getSessionMessages(filePath: string): RawSessionMessage[] {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return content
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line));
    } catch {
      return [];
    }
  }
}
