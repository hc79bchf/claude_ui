import type { ParsedSession } from '../../electron/services/types';
import type { McpServer } from '../types/mcp';
import type { Skill } from '../types/skill';
import type { UsageStats } from '../types';

export interface ChatEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolInput?: object;
  toolOutput?: string;
  isError?: boolean;
}

export interface ElectronAPI {
  getSessions: () => Promise<ParsedSession[]>;
  getSession: (id: string) => Promise<{ session: ParsedSession; messages: unknown[] } | null>;
  onSessionUpdate: (callback: (data: ParsedSession) => void) => () => void;
  getMcpServers: () => Promise<McpServer[]>;
  toggleMcpServer: (id: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  getSkills: () => Promise<Skill[]>;
  getStats: (period: 'today' | 'week' | 'month' | 'all') => Promise<UsageStats>;
  startChat: (projectPath: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  onChatResponse: (callback: (data: ChatEvent) => void) => () => void;
  onChatExit: (callback: (code: number) => void) => () => void;
  stopChat: () => Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

// Check if running in Electron
export const isElectron = typeof window !== 'undefined' && window.electronAPI !== undefined;

// Sample data for browser development testing
const sampleSessions: ParsedSession[] = [
  {
    id: 'session-1',
    slug: 'implement-dashboard',
    projectPath: '/Users/demo/projects/claude-dashboard',
    gitBranch: 'main',
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    lastActivityAt: new Date(Date.now() - 1800000).toISOString(),
    messageCount: 42,
    tokenUsage: { input: 15000, output: 8500, cacheRead: 3200, cacheCreation: 1500 },
    toolsUsed: { Read: 15, Edit: 8, Bash: 5, Write: 3 },
    skillsUsed: { 'superpowers:tdd': 2, 'superpowers:commit': 1 },
    model: 'claude-sonnet-4-20250514',
  },
  {
    id: 'session-2',
    slug: 'fix-authentication-bug',
    projectPath: '/Users/demo/projects/auth-service',
    gitBranch: 'fix/auth-token',
    startedAt: new Date(Date.now() - 86400000).toISOString(),
    lastActivityAt: new Date(Date.now() - 82800000).toISOString(),
    messageCount: 28,
    tokenUsage: { input: 9500, output: 4200, cacheRead: 2100, cacheCreation: 800 },
    toolsUsed: { Read: 12, Grep: 6, Edit: 4 },
    skillsUsed: { 'superpowers:debugging': 3 },
    model: 'claude-opus-4-20250514',
  },
  {
    id: 'session-3',
    slug: 'refactor-api-endpoints',
    projectPath: '/Users/demo/projects/api-gateway',
    gitBranch: 'feature/v2-api',
    startedAt: new Date(Date.now() - 172800000).toISOString(),
    lastActivityAt: new Date(Date.now() - 169200000).toISOString(),
    messageCount: 65,
    tokenUsage: { input: 22000, output: 12500, cacheRead: 5600, cacheCreation: 2200 },
    toolsUsed: { Read: 25, Edit: 18, Bash: 10, Write: 8 },
    skillsUsed: {},
    model: 'claude-sonnet-4-20250514',
  },
];

const sampleMcpServers: McpServer[] = [
  {
    id: 'filesystem',
    name: 'filesystem',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-filesystem', '/Users/demo'],
    enabled: true,
    source: 'global',
    tools: ['read_file', 'write_file', 'list_directory', 'search_files'],
    description: 'File system access for reading and writing files',
  },
  {
    id: 'github',
    name: 'github',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-github'],
    enabled: true,
    source: 'global',
    tools: ['create_issue', 'list_issues', 'create_pr', 'get_repo'],
    description: 'GitHub integration for issues and pull requests',
  },
  {
    id: 'postgres',
    name: 'postgres',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-postgres'],
    enabled: false,
    source: 'project',
    tools: ['query', 'execute', 'list_tables'],
    description: 'PostgreSQL database queries',
  },
];

const sampleSkills: Skill[] = [
  {
    id: 'superpowers:tdd',
    name: 'test-driven-development',
    plugin: 'superpowers',
    path: '~/.claude/plugins/cache/superpowers/skills/tdd',
    description: 'Test-driven development workflow',
    triggers: ['/tdd', 'write tests first'],
    usageCount: 15,
    lastUsedAt: new Date(Date.now() - 3600000),
  },
  {
    id: 'superpowers:commit',
    name: 'commit',
    plugin: 'superpowers',
    path: '~/.claude/plugins/cache/superpowers/skills/commit',
    description: 'Git commit with conventional commits',
    triggers: ['/commit'],
    usageCount: 42,
    lastUsedAt: new Date(Date.now() - 1800000),
  },
  {
    id: 'superpowers:debugging',
    name: 'systematic-debugging',
    plugin: 'superpowers',
    path: '~/.claude/plugins/cache/superpowers/skills/debugging',
    description: 'Systematic debugging workflow',
    triggers: ['/debug', 'fix bug'],
    usageCount: 8,
    lastUsedAt: new Date(Date.now() - 86400000),
  },
  {
    id: 'dev-browser:browse',
    name: 'dev-browser',
    plugin: 'dev-browser',
    path: '~/.claude/plugins/cache/dev-browser/skills/browse',
    description: 'Browser automation for testing',
    triggers: ['/browse', 'test website'],
    usageCount: 5,
    lastUsedAt: new Date(Date.now() - 172800000),
  },
];

const sampleStats: UsageStats = {
  totalCost: 12.45,
  totalTokens: 125000,
  sessionCount: 15,
  byModel: {
    'claude-sonnet-4-20250514': { cost: 8.20, tokens: 85000 },
    'claude-opus-4-20250514': { cost: 4.25, tokens: 40000 },
  },
  byProject: [
    { path: '/Users/demo/projects/claude-dashboard', cost: 4.50, sessions: 5 },
    { path: '/Users/demo/projects/auth-service', cost: 3.20, sessions: 4 },
    { path: '/Users/demo/projects/api-gateway', cost: 2.80, sessions: 3 },
    { path: '/Users/demo/projects/frontend-app', cost: 1.95, sessions: 3 },
  ],
  byDay: [
    { date: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0], cost: 1.20, tokens: 12000, sessions: 2 },
    { date: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], cost: 2.10, tokens: 21000, sessions: 3 },
    { date: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0], cost: 1.85, tokens: 18500, sessions: 2 },
    { date: new Date(Date.now() - 3 * 86400000).toISOString().split('T')[0], cost: 2.45, tokens: 24500, sessions: 3 },
    { date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], cost: 1.95, tokens: 19500, sessions: 2 },
    { date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0], cost: 1.70, tokens: 17000, sessions: 2 },
    { date: new Date().toISOString().split('T')[0], cost: 1.20, tokens: 12500, sessions: 1 },
  ],
};

// Chat simulation state
let chatResponseCallback: ((data: ChatEvent) => void) | null = null;
let chatExitCallback: ((code: number) => void) | null = null;

// Mock API for browser development with sample data
const mockAPI: ElectronAPI = {
  getSessions: async () => sampleSessions,
  getSession: async (id: string) => {
    const session = sampleSessions.find(s => s.id === id);
    if (!session) return null;
    return {
      session,
      messages: [
        { role: 'user', content: 'Help me implement a feature' },
        { role: 'assistant', content: 'I\'d be happy to help! What feature would you like to implement?' },
      ],
    };
  },
  onSessionUpdate: () => () => {},
  getMcpServers: async () => sampleMcpServers,
  toggleMcpServer: async (id, enabled) => {
    const server = sampleMcpServers.find(s => s.id === id);
    if (server) {
      server.enabled = enabled;
    }
    return { success: true };
  },
  getSkills: async () => sampleSkills,
  getStats: async () => sampleStats,
  startChat: async () => {
    // Simulate chat connection
    setTimeout(() => {
      if (chatResponseCallback) {
        chatResponseCallback({ type: 'text', content: 'Connected to Claude (Demo Mode)' });
      }
    }, 500);
  },
  sendMessage: async (message: string) => {
    // Simulate typing response
    setTimeout(() => {
      if (chatResponseCallback) {
        chatResponseCallback({ type: 'thinking', content: 'Analyzing your request...' });
      }
    }, 300);

    // Simulate response
    setTimeout(() => {
      if (chatResponseCallback) {
        chatResponseCallback({
          type: 'text',
          content: `This is a demo response to: "${message}"\n\nIn the actual Electron app, this would connect to the Claude CLI and provide real responses.`,
        });
        chatResponseCallback({ type: 'done' });
      }
    }, 1500);
  },
  onChatResponse: (callback) => {
    chatResponseCallback = callback;
    return () => { chatResponseCallback = null; };
  },
  onChatExit: (callback) => {
    chatExitCallback = callback;
    return () => { chatExitCallback = null; };
  },
  stopChat: async () => {
    if (chatExitCallback) {
      chatExitCallback(0);
    }
    chatResponseCallback = null;
    chatExitCallback = null;
  },
};

export const electronAPI: ElectronAPI = window.electronAPI ?? mockAPI;
