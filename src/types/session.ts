export interface Session {
  id: string;
  slug: string;
  projectPath: string;
  gitBranch: string;
  startedAt: Date;
  lastActivityAt: Date;
  messageCount: number;
  tokenUsage: TokenUsage;
  estimatedCost: number;
  toolsUsed: Record<string, number>;
  skillsUsed: Record<string, number>;
  status: 'active' | 'idle' | 'archived';
}

export interface TokenUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

export interface Message {
  id: string;
  sessionId: string;
  parentId: string | null;
  role: 'user' | 'assistant';
  content: ContentBlock[];
  timestamp: Date;
  model?: string;
}

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  isError?: boolean;
}

export interface SessionMeta {
  id: string;
  slug: string;
  projectPath: string;
  startedAt: Date;
  lastActivityAt: Date;
  messageCount: number;
}
