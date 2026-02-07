import type { ParsedSession } from '../types/session';
import type { McpServer } from '../types/mcp';
import type { Skill } from '../types/skill';
import type { UsageStats } from '../types';

// Detect backend URL based on how the app is being accessed
function getBackendUrl(): string {
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }
  // If accessed through a different port (like Docker nginx), use relative URLs
  if (typeof window !== 'undefined' && window.location.port !== '3001') {
    return `${window.location.protocol}//${window.location.host}`;
  }
  return 'http://localhost:3001';
}

function getWsUrl(): string {
  const backendUrl = getBackendUrl();
  // If using relative URL (same host), use /ws path
  if (typeof window !== 'undefined' && !backendUrl.includes(':3001')) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}/ws`;
  }
  return backendUrl.replace('http', 'ws');
}

const BACKEND_URL = getBackendUrl();
const WS_URL = getWsUrl();

// Chat WebSocket state
let chatWs: WebSocket | null = null;
let chatResponseCallback: ((data: ChatEvent) => void) | null = null;
let chatExitCallback: ((code: number) => void) | null = null;

async function isBackendAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      signal: AbortSignal.timeout(2000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export interface ChatEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolInput?: object;
  toolOutput?: string;
  isError?: boolean;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface DirectoryListResult {
  currentPath: string;
  parentPath: string | null;
  entries: DirectoryEntry[];
}

export interface API {
  getSessions: () => Promise<ParsedSession[]>;
  getSession: (id: string) => Promise<{ session: ParsedSession; messages: unknown[] } | null>;
  onSessionUpdate: (callback: (data: ParsedSession) => void) => () => void;
  getMcpServers: () => Promise<McpServer[]>;
  toggleMcpServer: (id: string, enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  getSkills: () => Promise<Skill[]>;
  getStats: (period: 'today' | 'week' | 'month' | 'all') => Promise<UsageStats>;
  listDirectory: (path?: string) => Promise<DirectoryListResult>;
  getHomePath: () => Promise<string>;
  startChat: (projectPath: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  onChatResponse: (callback: (data: ChatEvent) => void) => () => void;
  onChatExit: (callback: (code: number) => void) => () => void;
  stopChat: () => Promise<void>;
}

// Sample data for development/demo mode when backend is unavailable
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
  ],
  byDay: [
    { date: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0], cost: 1.95, tokens: 19500, sessions: 2 },
    { date: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0], cost: 1.70, tokens: 17000, sessions: 2 },
    { date: new Date().toISOString().split('T')[0], cost: 1.20, tokens: 12500, sessions: 1 },
  ],
};

// Demo/mock API for when backend is unavailable
let mockChatCallback: ((data: ChatEvent) => void) | null = null;

const mockAPI: API = {
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
    if (server) server.enabled = enabled;
    return { success: true };
  },
  getSkills: async () => sampleSkills,
  getStats: async () => sampleStats,
  listDirectory: async () => ({
    currentPath: '/Users/demo',
    parentPath: '/Users',
    entries: [
      { name: 'projects', path: '/Users/demo/projects', isDirectory: true },
      { name: 'Documents', path: '/Users/demo/Documents', isDirectory: true },
    ],
  }),
  getHomePath: async () => '/Users/demo',
  startChat: async () => {
    setTimeout(() => {
      if (mockChatCallback) {
        mockChatCallback({ type: 'text', content: 'Connected to Claude (Demo Mode)' });
      }
    }, 500);
  },
  sendMessage: async (message: string) => {
    setTimeout(() => {
      if (mockChatCallback) {
        mockChatCallback({ type: 'thinking', content: 'Analyzing your request...' });
      }
    }, 300);
    setTimeout(() => {
      if (mockChatCallback) {
        mockChatCallback({
          type: 'text',
          content: `This is a demo response to: "${message}"\n\nConnect to the backend for real Claude responses.`,
        });
        mockChatCallback({ type: 'done' });
      }
    }, 1500);
  },
  onChatResponse: (callback) => {
    mockChatCallback = callback;
    return () => { mockChatCallback = null; };
  },
  onChatExit: () => () => {},
  stopChat: async () => { mockChatCallback = null; },
};

// Backend API implementation
const backendAPI: API = {
  getSessions: async () => {
    const res = await fetch(`${BACKEND_URL}/api/sessions`);
    if (!res.ok) throw new Error('Failed to fetch sessions');
    return res.json();
  },
  getSession: async (id: string) => {
    const res = await fetch(`${BACKEND_URL}/api/sessions/${id}`);
    if (!res.ok) return null;
    return res.json();
  },
  onSessionUpdate: (callback) => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe:sessions' }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'session:update') {
        callback(msg.session);
      }
    };
    return () => ws.close();
  },
  getMcpServers: async () => {
    const res = await fetch(`${BACKEND_URL}/api/mcp-servers`);
    if (!res.ok) throw new Error('Failed to fetch MCP servers');
    return res.json();
  },
  toggleMcpServer: async (id, enabled) => {
    const res = await fetch(`${BACKEND_URL}/api/mcp-servers/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });
    return res.json();
  },
  getSkills: async () => {
    const res = await fetch(`${BACKEND_URL}/api/skills`);
    if (!res.ok) throw new Error('Failed to fetch skills');
    return res.json();
  },
  getStats: async (period) => {
    const res = await fetch(`${BACKEND_URL}/api/stats?period=${period}`);
    if (!res.ok) throw new Error('Failed to fetch stats');
    return res.json();
  },
  listDirectory: async (path?: string) => {
    const url = path
      ? `${BACKEND_URL}/api/filesystem/list?path=${encodeURIComponent(path)}`
      : `${BACKEND_URL}/api/filesystem/list`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to list directory');
    return res.json();
  },
  getHomePath: async () => {
    const res = await fetch(`${BACKEND_URL}/api/filesystem/home`);
    if (!res.ok) throw new Error('Failed to get home path');
    const data = await res.json();
    return data.path;
  },
  startChat: async (projectPath: string) => {
    return new Promise<void>((resolve, reject) => {
      if (chatWs) {
        chatWs.close();
      }

      chatWs = new WebSocket(WS_URL);

      chatWs.onopen = () => {
        chatWs!.send(JSON.stringify({ type: 'chat:start', projectPath }));
        resolve();
      };

      chatWs.onerror = () => {
        reject(new Error('WebSocket connection failed'));
      };

      chatWs.onmessage = (e) => {
        console.log('[WS] Received message:', e.data);
        try {
          const msg = JSON.parse(e.data);
          console.log('[WS] Parsed message:', msg.type, msg.content?.slice?.(0, 50));
          if (msg.type === 'chat:exit') {
            if (chatExitCallback) {
              chatExitCallback(msg.code);
            }
          } else if (msg.type.startsWith('chat:')) {
            const eventType = msg.type.replace('chat:', '');
            console.log('[WS] Calling callback for event:', eventType, 'hasCallback:', !!chatResponseCallback);
            if (chatResponseCallback) {
              chatResponseCallback({
                type: eventType as ChatEvent['type'],
                content: msg.content,
                toolName: msg.toolName,
                toolInput: msg.toolInput,
                toolOutput: msg.toolOutput,
                isError: msg.isError,
              });
            }
          }
        } catch (err) {
          console.error('[WS] Parse error:', err);
        }
      };

      chatWs.onclose = () => {
        if (chatExitCallback) {
          chatExitCallback(0);
        }
        chatWs = null;
      };
    });
  },
  sendMessage: async (message: string) => {
    if (chatWs && chatWs.readyState === WebSocket.OPEN) {
      chatWs.send(JSON.stringify({ type: 'chat:message', content: message }));
    } else {
      throw new Error('Chat not connected');
    }
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
    if (chatWs) {
      chatWs.send(JSON.stringify({ type: 'chat:stop' }));
      chatWs.close();
      chatWs = null;
    }
    chatResponseCallback = null;
    chatExitCallback = null;
  },
};

let cachedAPI: API | null = null;

export async function getAPI(): Promise<API> {
  if (cachedAPI) return cachedAPI;

  if (await isBackendAvailable()) {
    console.log('Using backend API at', BACKEND_URL);
    cachedAPI = backendAPI;
  } else {
    console.log('Using mock API (backend not available)');
    cachedAPI = mockAPI;
  }

  return cachedAPI;
}

// Default export for immediate use (defaults to mock until getAPI is called)
export const api: API = mockAPI;
