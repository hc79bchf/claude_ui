import { useState } from 'react';
import type { ToolUseBlock, ToolResultBlock } from '../../hooks/useChat';

interface ToolChipProps {
  toolUse: ToolUseBlock;
  toolResult?: ToolResultBlock;
}

function formatToolInput(input: object | undefined): string {
  if (!input) return '';
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

export function ToolChip({ toolUse, toolResult }: ToolChipProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasDetails = toolUse.toolInput || toolResult?.toolOutput;
  const isError = toolResult?.isError;

  return (
    <div className="my-2">
      <button
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
          transition-colors
          ${isError
            ? 'bg-red-900/50 text-red-300 hover:bg-red-900/70'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }
          ${!hasDetails ? 'cursor-default' : 'cursor-pointer'}
        `}
        disabled={!hasDetails}
      >
        {/* Tool icon */}
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>

        <span className="font-medium">{toolUse.toolName}</span>

        {/* Status indicator */}
        {toolResult ? (
          isError ? (
            <span className="text-red-400 text-xs">failed</span>
          ) : (
            <span className="text-green-400 text-xs">done</span>
          )
        ) : (
          <span className="text-yellow-400 text-xs animate-pulse">running</span>
        )}

        {/* Expand chevron */}
        {hasDetails && (
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="mt-2 ml-2 p-3 bg-gray-800 rounded-lg border border-gray-700 text-sm">
          {toolUse.toolInput && (
            <div className="mb-3">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Input
              </div>
              <pre className="text-gray-300 whitespace-pre-wrap break-words overflow-x-auto max-h-48 overflow-y-auto">
                {formatToolInput(toolUse.toolInput)}
              </pre>
            </div>
          )}

          {toolResult?.toolOutput && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Output
              </div>
              <pre
                className={`whitespace-pre-wrap break-words overflow-x-auto max-h-48 overflow-y-auto ${
                  isError ? 'text-red-400' : 'text-gray-300'
                }`}
              >
                {toolResult.toolOutput}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
