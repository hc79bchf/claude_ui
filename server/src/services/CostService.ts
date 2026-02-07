import { ParsedSession } from './types.js';
import { UsageStats } from './shared-types.js';

export type TimePeriod = 'today' | 'week' | 'month' | 'all';

interface ModelPricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheHitDiscount: number; // Percentage discount for cache hits (e.g., 0.9 = 90% off)
}

// Model pricing constants (per million tokens)
const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-opus-4-5-20251101': {
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheHitDiscount: 0.9,
  },
  'claude-sonnet-4-20250514': {
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheHitDiscount: 0.9,
  },
  // Legacy model names for backwards compatibility
  'claude-3-opus': {
    inputPerMillion: 15,
    outputPerMillion: 75,
    cacheHitDiscount: 0.9,
  },
  'claude-3-sonnet': {
    inputPerMillion: 3,
    outputPerMillion: 15,
    cacheHitDiscount: 0.9,
  },
  // Haiku models
  'claude-haiku-3-20240307': {
    inputPerMillion: 0.25,
    outputPerMillion: 1.25,
    cacheHitDiscount: 0.9,
  },
  'claude-haiku-3.5': {
    inputPerMillion: 0.80,
    outputPerMillion: 4.00,
    cacheHitDiscount: 0.9,
  },
};

// Default pricing for unknown models (use Sonnet pricing as fallback)
const DEFAULT_PRICING: ModelPricing = {
  inputPerMillion: 3,
  outputPerMillion: 15,
  cacheHitDiscount: 0.9,
};

export class CostService {
  /**
   * Get pricing for a model, matching by prefix if exact match not found
   */
  private getModelPricing(model: string): ModelPricing {
    // Try exact match first
    if (MODEL_PRICING[model]) {
      return MODEL_PRICING[model];
    }

    // Try prefix matching for model variants
    const modelLower = model.toLowerCase();
    if (modelLower.includes('opus')) {
      return MODEL_PRICING['claude-opus-4-5-20251101'];
    }
    if (modelLower.includes('sonnet')) {
      return MODEL_PRICING['claude-sonnet-4-20250514'];
    }

    return DEFAULT_PRICING;
  }

  /**
   * Calculate cost for a single session
   */
  calculateSessionCost(session: ParsedSession): number {
    const pricing = this.getModelPricing(session.model);
    const { input, output, cacheRead } = session.tokenUsage;

    // Regular input tokens (excluding cache reads)
    const regularInputTokens = Math.max(0, input - cacheRead);

    // Calculate costs
    const regularInputCost = (regularInputTokens / 1_000_000) * pricing.inputPerMillion;
    const cacheReadCost = (cacheRead / 1_000_000) * pricing.inputPerMillion * (1 - pricing.cacheHitDiscount);
    const outputCost = (output / 1_000_000) * pricing.outputPerMillion;

    return regularInputCost + cacheReadCost + outputCost;
  }

  /**
   * Filter sessions by time period
   */
  filterSessionsByPeriod(sessions: ParsedSession[], period: TimePeriod): ParsedSession[] {
    const now = new Date();
    let cutoffDate: Date;

    switch (period) {
      case 'today':
        cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        return sessions;
    }

    return sessions.filter(session => {
      const sessionDate = new Date(session.lastActivityAt);
      return sessionDate >= cutoffDate;
    });
  }

  /**
   * Aggregate statistics across all sessions
   */
  aggregateStats(sessions: ParsedSession[], period: TimePeriod = 'all'): UsageStats {
    const filteredSessions = this.filterSessionsByPeriod(sessions, period);

    // Initialize accumulators
    let totalCost = 0;
    let totalTokens = 0;
    const byModel: Record<string, { tokens: number; cost: number }> = {};
    const byProjectMap: Map<string, { cost: number; sessions: number }> = new Map();
    const byDayMap: Map<string, { tokens: number; cost: number; sessions: number }> = new Map();

    for (const session of filteredSessions) {
      const cost = this.calculateSessionCost(session);
      const tokens = session.tokenUsage.input + session.tokenUsage.output;

      totalCost += cost;
      totalTokens += tokens;

      // Aggregate by model
      const modelKey = this.normalizeModelName(session.model);
      if (!byModel[modelKey]) {
        byModel[modelKey] = { tokens: 0, cost: 0 };
      }
      byModel[modelKey].tokens += tokens;
      byModel[modelKey].cost += cost;

      // Aggregate by project
      const projectPath = session.projectPath || 'Unknown';
      const projectStats = byProjectMap.get(projectPath) || { cost: 0, sessions: 0 };
      projectStats.cost += cost;
      projectStats.sessions += 1;
      byProjectMap.set(projectPath, projectStats);

      // Aggregate by day
      const dayKey = new Date(session.lastActivityAt).toISOString().split('T')[0];
      const dayStats = byDayMap.get(dayKey) || { tokens: 0, cost: 0, sessions: 0 };
      dayStats.tokens += tokens;
      dayStats.cost += cost;
      dayStats.sessions += 1;
      byDayMap.set(dayKey, dayStats);
    }

    // Convert maps to arrays and sort
    const byProject = Array.from(byProjectMap.entries())
      .map(([path, stats]) => ({ path, ...stats }))
      .sort((a, b) => b.cost - a.cost);

    const byDay = Array.from(byDayMap.entries())
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalCost,
      totalTokens,
      sessionCount: filteredSessions.length,
      byModel,
      byProject,
      byDay,
    };
  }

  /**
   * Normalize model name for display
   */
  private normalizeModelName(model: string): string {
    const modelLower = model.toLowerCase();
    if (modelLower.includes('opus')) {
      return 'Claude Opus';
    }
    if (modelLower.includes('sonnet')) {
      return 'Claude Sonnet';
    }
    if (modelLower.includes('haiku')) {
      return 'Claude Haiku';
    }
    return model;
  }
}
