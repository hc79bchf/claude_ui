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

// Types for raw session data from backend/filesystem
export interface RawSessionMessage {
  type: 'user' | 'assistant' | 'progress';
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  cwd: string;
  version: string;
  gitBranch: string;
  slug: string;
  message?: {
    role: 'user' | 'assistant';
    content: Array<{
      type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
      text?: string;
      thinking?: string;
      name?: string;
      input?: object;
    }>;
    model?: string;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_read_input_tokens?: number;
      cache_creation_input_tokens?: number;
    };
  };
}

export interface ParsedSession {
  id: string;
  slug: string;
  projectPath: string;
  gitBranch: string;
  startedAt: string;
  lastActivityAt: string;
  messageCount: number;
  tokenUsage: {
    input: number;
    output: number;
    cacheRead: number;
    cacheCreation: number;
  };
  toolsUsed: Record<string, number>;
  skillsUsed: Record<string, number>;
  model: string;
}
