interface SessionCardProps {
  session: {
    id: string;
    slug: string;
    projectPath: string;
    gitBranch: string;
    lastActivityAt: string;
    messageCount: number;
    tokenUsage: {
      input: number;
      output: number;
    };
    toolsUsed: Record<string, number>;
  };
  onClick: () => void;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatTokens(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const topTools = Object.entries(session.toolsUsed)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const projectName = session.projectPath?.split('/').pop() || session.projectPath || 'Unknown';

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors border border-gray-700 hover:border-gray-600"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-white truncate">{session.slug}</h3>
          <p className="text-sm text-gray-400 truncate">{projectName}</p>
        </div>
        <span className="text-xs text-gray-500 whitespace-nowrap">
          {formatRelativeTime(session.lastActivityAt)}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
        <span>{session.messageCount} messages</span>
        <span>{formatTokens(session.tokenUsage.input + session.tokenUsage.output)} tokens</span>
        <span className="text-gray-600">{session.gitBranch}</span>
      </div>

      {topTools.length > 0 && (
        <div className="mt-2 flex gap-1 flex-wrap">
          {topTools.map(([tool, count]) => (
            <span
              key={tool}
              className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-300"
            >
              {tool} ({count})
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
