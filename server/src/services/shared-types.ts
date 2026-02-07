// MCP types
export interface McpServer {
  id: string;
  name: string;
  type: 'stdio' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  enabled: boolean;
  source: string;
  tools: string[];
  description?: string;
}

export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
  disabledMcpServers?: string[];
}

export interface McpServerConfig {
  type?: 'stdio' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  description?: string;
}

// Skill types
export interface Skill {
  id: string;
  name: string;
  plugin: string;
  path: string;
  description: string;
  triggers: string[];
  usageCount: number;
  lastUsedAt: Date | null;
}

// Usage stats types
export interface UsageStats {
  totalCost: number;
  totalTokens: number;
  sessionCount: number;
  byModel: Record<string, { tokens: number; cost: number }>;
  byProject: Array<{ path: string; cost: number; sessions: number }>;
  byDay: Array<{ date: string; tokens: number; cost: number; sessions: number }>;
}
