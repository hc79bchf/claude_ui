import { useState } from 'react';
import type { McpServer } from '../../types/mcp';

interface McpServerCardProps {
  server: McpServer;
  onToggle: (id: string, enabled: boolean) => void;
  isToggling?: boolean;
}

export function McpServerCard({ server, onToggle, isToggling }: McpServerCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasDetails = server.command || server.url || (server.env && Object.keys(server.env).length > 0);
  const isGlobal = server.source === 'global';

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-white truncate">{server.name}</h3>

            {/* Type badge */}
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                server.type === 'stdio'
                  ? 'bg-blue-900/50 text-blue-300'
                  : 'bg-purple-900/50 text-purple-300'
              }`}
            >
              {server.type.toUpperCase()}
            </span>

            {/* Source badge */}
            <span
              className={`px-2 py-0.5 rounded text-xs ${
                isGlobal
                  ? 'bg-gray-700 text-gray-400'
                  : 'bg-green-900/50 text-green-300'
              }`}
            >
              {isGlobal ? 'Global' : 'Project'}
            </span>
          </div>

          {server.description && (
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">
              {server.description}
            </p>
          )}
        </div>

        {/* Toggle switch */}
        <button
          onClick={() => onToggle(server.id, !server.enabled)}
          disabled={isToggling}
          className={`
            relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full
            border-2 border-transparent transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-900
            ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}
            ${server.enabled ? 'bg-orange-500' : 'bg-gray-600'}
          `}
          role="switch"
          aria-checked={server.enabled}
          aria-label={`${server.enabled ? 'Disable' : 'Enable'} ${server.name}`}
        >
          <span
            className={`
              pointer-events-none inline-block h-5 w-5 transform rounded-full
              bg-white shadow ring-0 transition duration-200 ease-in-out
              ${server.enabled ? 'translate-x-5' : 'translate-x-0'}
            `}
          />
        </button>
      </div>

      {/* Tools list */}
      {server.tools.length > 0 && (
        <div className="mt-3 flex gap-1 flex-wrap">
          {server.tools.slice(0, 5).map((tool) => (
            <span
              key={tool}
              className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
            >
              {tool}
            </span>
          ))}
          {server.tools.length > 5 && (
            <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-500">
              +{server.tools.length - 5} more
            </span>
          )}
        </div>
      )}

      {/* Expand/collapse button */}
      {hasDetails && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-400 transition-colors"
        >
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
          <span>{isExpanded ? 'Hide details' : 'Show details'}</span>
        </button>
      )}

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className="mt-3 p-3 bg-gray-900 rounded border border-gray-700 text-sm space-y-3">
          {/* Command (for stdio) */}
          {server.command && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Command
              </div>
              <code className="text-gray-300 text-xs block bg-gray-800 p-2 rounded overflow-x-auto">
                {server.command}
                {server.args && server.args.length > 0 && (
                  <span className="text-gray-500"> {server.args.join(' ')}</span>
                )}
              </code>
            </div>
          )}

          {/* URL (for http) */}
          {server.url && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                URL
              </div>
              <code className="text-gray-300 text-xs block bg-gray-800 p-2 rounded overflow-x-auto">
                {server.url}
              </code>
            </div>
          )}

          {/* Environment variables */}
          {server.env && Object.keys(server.env).length > 0 && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Environment Variables
              </div>
              <div className="bg-gray-800 p-2 rounded space-y-1">
                {Object.entries(server.env).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <span className="text-blue-400">{key}</span>
                    <span className="text-gray-500">=</span>
                    <span className="text-gray-400">
                      {value.includes('KEY') || value.includes('SECRET') || value.includes('TOKEN')
                        ? '********'
                        : value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Source path (for project configs) */}
          {!isGlobal && (
            <div>
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                Source
              </div>
              <code className="text-gray-400 text-xs">{server.source}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
