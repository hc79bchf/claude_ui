import { useState } from 'react';
import { useStats, StatsPeriod } from '../../hooks/useStats';
import { StatCard } from './StatCard';

const PERIOD_OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

function formatTokens(count: number): string {
  if (count >= 1000000) return `${(count / 1000000).toFixed(2)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return count.toString();
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getProjectName(path: string | undefined | null): string {
  if (!path) return 'Unknown';
  return path.split('/').pop() || path;
}

export function StatsView() {
  const [period, setPeriod] = useState<StatsPeriod>('week');
  const { data: stats, isLoading, error } = useStats(period);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading stats...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-3xl mb-2">⚠</div>
          <p className="text-red-400">Error loading stats</p>
          <p className="text-sm text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-600 text-3xl mb-2">📊</div>
          <p className="text-gray-400">No stats available</p>
          <p className="text-sm text-gray-500 mt-1">
            Start using Claude to see your usage statistics
          </p>
        </div>
      </div>
    );
  }

  const avgCostPerSession = stats.sessionCount > 0
    ? stats.totalCost / stats.sessionCount
    : 0;

  // Get display count for days based on period
  const daysToShow = period === 'today' ? 1 : period === 'week' ? 7 : 30;
  const displayDays = stats.byDay.slice(-daysToShow);

  // Top 10 projects by cost
  const topProjects = [...stats.byProject]
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 10);

  // Models sorted by cost
  const modelEntries = Object.entries(stats.byModel)
    .sort((a, b) => b[1].cost - a[1].cost);

  return (
    <div className="p-4 overflow-y-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold">Usage Statistics</h1>

        {/* Period selector */}
        <div className="flex bg-gray-800 rounded-lg p-1 gap-1">
          {PERIOD_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                period === option.value
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Cost"
          value={formatCurrency(stats.totalCost)}
          subtitle={`${PERIOD_OPTIONS.find(o => o.value === period)?.label}`}
        />
        <StatCard
          title="Total Tokens"
          value={formatTokens(stats.totalTokens)}
          subtitle="Input + Output"
        />
        <StatCard
          title="Sessions"
          value={stats.sessionCount.toString()}
          subtitle="Conversations"
        />
        <StatCard
          title="Avg Cost/Session"
          value={formatCurrency(avgCostPerSession)}
          subtitle="Per conversation"
        />
      </div>

      {/* Model breakdown */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Usage by Model</h2>
        {modelEntries.length === 0 ? (
          <p className="text-gray-500 text-sm">No model usage data</p>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Model</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Tokens</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Cost</th>
                </tr>
              </thead>
              <tbody>
                {modelEntries.map(([model, data]) => (
                  <tr key={model} className="border-b border-gray-700 last:border-0">
                    <td className="px-4 py-3 text-sm text-white font-mono">{model}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{formatTokens(data.tokens)}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{formatCurrency(data.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Project breakdown */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Top Projects by Cost</h2>
        {topProjects.length === 0 ? (
          <p className="text-gray-500 text-sm">No project usage data</p>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Project</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Sessions</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Cost</th>
                </tr>
              </thead>
              <tbody>
                {topProjects.map((project) => (
                  <tr key={project.path} className="border-b border-gray-700 last:border-0">
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{getProjectName(project.path)}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs" title={project.path}>
                        {project.path}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{project.sessions}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{formatCurrency(project.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Daily breakdown */}
      <section className="mb-8">
        <h2 className="text-lg font-medium mb-4">Daily Usage</h2>
        {displayDays.length === 0 ? (
          <p className="text-gray-500 text-sm">No daily usage data</p>
        ) : (
          <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-400">Date</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Sessions</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Tokens</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-400">Cost</th>
                </tr>
              </thead>
              <tbody>
                {displayDays.map((day) => (
                  <tr key={day.date} className="border-b border-gray-700 last:border-0">
                    <td className="px-4 py-3 text-sm text-white">{formatDate(day.date)}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{day.sessions}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{formatTokens(day.tokens)}</td>
                    <td className="px-4 py-3 text-sm text-gray-300 text-right">{formatCurrency(day.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
