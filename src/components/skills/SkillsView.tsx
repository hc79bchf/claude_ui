import { useState, useMemo } from 'react';
import { useSkills } from '../../hooks/useSkills';
import { SkillCard } from './SkillCard';
import type { Skill } from '../../types/skill';

export function SkillsView() {
  const { skills, isLoading, error } = useSkills();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter skills by search query
  const filteredSkills = useMemo(() => {
    if (!skills) return [];
    if (!searchQuery.trim()) return skills;

    const query = searchQuery.toLowerCase();
    return skills.filter(
      (skill) =>
        skill.name.toLowerCase().includes(query) ||
        skill.description.toLowerCase().includes(query) ||
        skill.triggers.some((t) => t.toLowerCase().includes(query)) ||
        skill.plugin.toLowerCase().includes(query)
    );
  }, [skills, searchQuery]);

  // Group skills by plugin
  const groupedSkills = useMemo(() => {
    const groups: Record<string, Skill[]> = {};
    for (const skill of filteredSkills) {
      if (!groups[skill.plugin]) {
        groups[skill.plugin] = [];
      }
      groups[skill.plugin].push(skill);
    }
    // Sort plugins alphabetically, sort skills by usage count within each group
    const sortedGroups: Record<string, Skill[]> = {};
    const sortedKeys = Object.keys(groups).sort();
    for (const key of sortedKeys) {
      sortedGroups[key] = groups[key].sort((a, b) => b.usageCount - a.usageCount);
    }
    return sortedGroups;
  }, [filteredSkills]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!skills) return { total: 0, totalUsage: 0, plugins: 0 };
    const plugins = new Set(skills.map((s) => s.plugin));
    const totalUsage = skills.reduce((sum, s) => sum + s.usageCount, 0);
    return {
      total: skills.length,
      totalUsage,
      plugins: plugins.size,
    };
  }, [skills]);

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
          <p>Loading skills...</p>
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
          <p className="text-red-400">Error loading skills</p>
          <p className="text-sm text-gray-500 mt-1">
            {error instanceof Error ? error.message : 'Unknown error occurred'}
          </p>
        </div>
      </div>
    );
  }

  if (!skills || skills.length === 0) {
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <p className="text-gray-400 text-lg">No skills discovered</p>
          <p className="text-sm text-gray-500 mt-2">
            Skills are discovered from plugins and provide slash commands like /commit, /review, etc.
          </p>
          <div className="mt-4 text-xs text-gray-600">
            <p>Skills will appear here as you use Claude Code</p>
          </div>
        </div>
      </div>
    );
  }

  const pluginNames = Object.keys(groupedSkills);

  return (
    <div className="p-4 h-full overflow-y-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Skills</h1>
        <p className="text-sm text-gray-400 mt-1">
          Discovered skills from plugins with slash command triggers
        </p>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search skills by name, description, or trigger..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Stats summary */}
      <div className="mb-6 flex gap-4 text-sm">
        <div className="px-3 py-2 bg-gray-800 rounded-lg">
          <span className="text-gray-400">Total Skills: </span>
          <span className="text-white font-medium">{stats.total}</span>
        </div>
        <div className="px-3 py-2 bg-gray-800 rounded-lg">
          <span className="text-gray-400">Total Usage: </span>
          <span className="text-orange-400 font-medium">{stats.totalUsage}</span>
        </div>
        <div className="px-3 py-2 bg-gray-800 rounded-lg">
          <span className="text-gray-400">Plugins: </span>
          <span className="text-purple-400 font-medium">{stats.plugins}</span>
        </div>
      </div>

      {/* Filtered results info */}
      {searchQuery && (
        <div className="mb-4 text-sm text-gray-500">
          Found {filteredSkills.length} skill{filteredSkills.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </div>
      )}

      {/* No results */}
      {searchQuery && filteredSkills.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No skills match your search</p>
          <button
            onClick={() => setSearchQuery('')}
            className="mt-2 text-sm text-orange-400 hover:text-orange-300"
          >
            Clear search
          </button>
        </div>
      )}

      {/* Skills grouped by plugin */}
      {pluginNames.map((pluginName) => (
        <section key={pluginName} className="mb-6">
          <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">
            {pluginName} ({groupedSkills[pluginName].length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {groupedSkills[pluginName].map((skill) => (
              <SkillCard key={skill.id} skill={skill} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
