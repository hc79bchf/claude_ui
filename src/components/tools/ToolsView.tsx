import { useMcpServers } from '../../hooks/useMcpServers';
import { McpServerCard } from './McpServerCard';

export function ToolsView() {
  const { servers, isLoading, error, toggleServer, isToggling } = useMcpServers();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <p>Loading MCP servers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-400 mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-red-400">Error loading MCP servers</p>
          <p className="text-sm text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  if (!servers || servers.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="text-gray-600 mb-4">
            <svg
              className="w-16 h-16 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              />
            </svg>
          </div>
          <p className="text-gray-400 text-lg">No MCP servers configured</p>
          <p className="text-sm text-gray-500 mt-2">
            Add MCP servers to your global or project configuration to enable additional tools and capabilities.
          </p>
          <div className="mt-4 text-xs text-gray-600">
            <p>Global config: ~/.claude/config.json</p>
            <p>Project config: .mcp.json</p>
          </div>
        </div>
      </div>
    );
  }

  // Group servers by source type
  const globalServers = servers.filter((s) => s.source === 'global');
  const projectServers = servers.filter((s) => s.source !== 'global');

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Tools</h1>
        <p className="text-sm text-gray-400 mt-1">
          Manage MCP servers that provide additional tools and capabilities
        </p>
      </div>

      {/* Stats summary */}
      <div className="mb-6 flex gap-4 text-sm">
        <div className="px-3 py-2 bg-gray-800 rounded-lg">
          <span className="text-gray-400">Total: </span>
          <span className="text-white font-medium">{servers.length}</span>
        </div>
        <div className="px-3 py-2 bg-gray-800 rounded-lg">
          <span className="text-gray-400">Enabled: </span>
          <span className="text-green-400 font-medium">
            {servers.filter((s) => s.enabled).length}
          </span>
        </div>
        <div className="px-3 py-2 bg-gray-800 rounded-lg">
          <span className="text-gray-400">Disabled: </span>
          <span className="text-gray-500 font-medium">
            {servers.filter((s) => !s.enabled).length}
          </span>
        </div>
      </div>

      {/* Global servers section */}
      {globalServers.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            Global Servers ({globalServers.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {globalServers.map((server) => (
              <McpServerCard
                key={server.id}
                server={server}
                onToggle={toggleServer}
                isToggling={isToggling}
              />
            ))}
          </div>
        </section>
      )}

      {/* Project servers section */}
      {projectServers.length > 0 && (
        <section>
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            Project Servers ({projectServers.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {projectServers.map((server) => (
              <McpServerCard
                key={server.id}
                server={server}
                onToggle={toggleServer}
                isToggling={isToggling}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
