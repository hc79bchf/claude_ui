import { useState } from 'react';
import type { Skill } from '../../types/skill';

interface SkillCardProps {
  skill: Skill;
}

function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never';

  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 30) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export function SkillCard({ skill }: SkillCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasLongDescription = skill.description && skill.description.length > 100;
  const displayDescription = isExpanded
    ? skill.description
    : skill.description?.slice(0, 100) + (hasLongDescription ? '...' : '');

  return (
    <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-medium text-white truncate">{skill.name}</h3>

            {/* Plugin badge */}
            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-900/50 text-purple-300">
              {skill.plugin}
            </span>
          </div>

          {/* Description */}
          {skill.description && (
            <p className="text-sm text-gray-400 mt-1">
              {displayDescription}
            </p>
          )}
        </div>

        {/* Usage count badge */}
        <div className="flex-shrink-0 text-right">
          <div className="px-2 py-1 bg-gray-700 rounded text-xs">
            <span className="text-gray-400">Used </span>
            <span className="text-white font-medium">{skill.usageCount}</span>
            <span className="text-gray-400">x</span>
          </div>
        </div>
      </div>

      {/* Trigger patterns as clickable chips */}
      {skill.triggers.length > 0 && (
        <div className="mt-3 flex gap-2 flex-wrap">
          {skill.triggers.map((trigger) => (
            <span
              key={trigger}
              className="px-2 py-1 bg-orange-900/30 border border-orange-700/50 rounded text-xs text-orange-300 font-mono cursor-default hover:bg-orange-900/50 transition-colors"
              title={`Trigger: ${trigger}`}
            >
              {trigger}
            </span>
          ))}
        </div>
      )}

      {/* Usage stats row */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>
          Last used: {formatRelativeTime(skill.lastUsedAt)}
        </span>
        <span className="text-gray-600">|</span>
        <span className="truncate" title={skill.path}>
          {skill.path}
        </span>
      </div>

      {/* Expand/collapse button for long descriptions */}
      {hasLongDescription && (
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
          <span>{isExpanded ? 'Show less' : 'Show more'}</span>
        </button>
      )}
    </div>
  );
}
