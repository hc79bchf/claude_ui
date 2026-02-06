import { ReactNode } from 'react';
import type { Message, ContentBlock, ToolUseBlock, ToolResultBlock } from '../../hooks/useChat';
import { ToolChip } from './ToolChip';

interface MessageBubbleProps {
  message: Message;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderTextContent(content: string): ReactNode {
  // Simple text rendering - could be enhanced with markdown support later
  return (
    <div className="whitespace-pre-wrap break-words">
      {content}
    </div>
  );
}

function renderThinkingContent(content: string): ReactNode {
  return (
    <div className="italic text-gray-400 border-l-2 border-gray-600 pl-3 my-2">
      <div className="text-xs text-gray-500 mb-1">Thinking...</div>
      <div className="whitespace-pre-wrap break-words text-sm">
        {content}
      </div>
    </div>
  );
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  // Pair tool_use blocks with their corresponding tool_result blocks
  const pairedBlocks: Array<{
    block: ContentBlock;
    result?: ToolResultBlock;
  }> = [];

  for (let i = 0; i < message.content.length; i++) {
    const block = message.content[i];

    if (block.type === 'tool_use') {
      // Look for the next tool_result block
      const nextBlock = message.content[i + 1];
      if (nextBlock && nextBlock.type === 'tool_result') {
        pairedBlocks.push({ block, result: nextBlock as ToolResultBlock });
        i++; // Skip the tool_result block in the next iteration
      } else {
        pairedBlocks.push({ block });
      }
    } else if (block.type === 'tool_result') {
      // Orphaned tool_result (shouldn't happen, but handle it)
      pairedBlocks.push({ block });
    } else {
      pairedBlocks.push({ block });
    }
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`
          max-w-[85%] rounded-2xl px-4 py-3
          ${isUser
            ? 'bg-blue-600 text-white rounded-br-md'
            : 'bg-gray-800 text-gray-100 rounded-bl-md border border-gray-700'
          }
        `}
      >
        {/* Message content */}
        <div className="space-y-1">
          {pairedBlocks.map((item, index) => {
            const { block, result } = item;

            switch (block.type) {
              case 'text':
                return (
                  <div key={index}>
                    {renderTextContent(block.content)}
                  </div>
                );

              case 'thinking':
                return (
                  <div key={index}>
                    {renderThinkingContent(block.content)}
                  </div>
                );

              case 'tool_use':
                return (
                  <ToolChip
                    key={index}
                    toolUse={block as ToolUseBlock}
                    toolResult={result}
                  />
                );

              case 'tool_result':
                // Only render if it wasn't paired with a tool_use
                return (
                  <div
                    key={index}
                    className={`my-2 p-2 rounded text-sm ${
                      block.isError
                        ? 'bg-red-900/30 text-red-300'
                        : 'bg-gray-700/50 text-gray-300'
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-1">Tool Result</div>
                    <pre className="whitespace-pre-wrap break-words">
                      {block.toolOutput || 'No output'}
                    </pre>
                  </div>
                );

              default:
                return null;
            }
          })}
        </div>

        {/* Timestamp */}
        <div
          className={`
            text-xs mt-2
            ${isUser ? 'text-blue-200' : 'text-gray-500'}
          `}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}
