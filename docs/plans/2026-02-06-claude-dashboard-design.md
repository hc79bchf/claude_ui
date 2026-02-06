# Claude Dashboard - Design Document

**Date:** 2026-02-06
**Status:** Draft
**Author:** Generated via brainstorming session

---

## 1. Overview & Goals

### What is Claude Dashboard?

A desktop application for developers to monitor, search, and interact with Claude Code sessions.

### Core Goals

1. **Visibility** - See token spend, costs, and usage patterns at a glance
2. **History** - Search and browse past sessions across all projects
3. **Management** - Configure MCP tools and skills without editing JSON
4. **Interaction** - Chat with Claude in a polished GUI environment
5. **Skills Tracking** - Browse, manage, and invoke skills with usage analytics
6. **Slash Commands** - Track command usage and quick-invoke from UI

### Target User

Power users of Claude Code who want deeper insight into their usage and a more visual interface than the CLI alone provides.

### Non-Goals (MVP)

- Team/organization features (use Analytics API directly)
- Cloud sync (local-only for privacy)
- Mobile support

### Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Electron | Direct filesystem access, cross-platform |
| UI | React 18 + TypeScript | Strong ecosystem, type safety |
| Styling | TailwindCSS | Rapid iteration, consistent design |
| State | Zustand + TanStack Query | Simple, performant async handling |
| File watching | chokidar | Battle-tested, handles edge cases |
| Search | FlexSearch | Fast in-memory full-text search |
| Chat | Claude CLI subprocess | Uses existing auth, simpler than SDK |

---

## 2. Data Architecture

### Data Sources

```
~/.claude/
├── projects/
│   └── {project-path}/
│       └── {session-id}.jsonl     # Full conversation history
├── stats-cache.json               # Aggregate usage stats
├── settings.json                  # User preferences
├── history.jsonl                  # Command history
├── plugins/
│   ├── installed_plugins.json     # Plugin registry
│   └── cache/{plugin}/
│       ├── .mcp.json              # MCP server configs
│       └── skills/                # Skill definitions
└── todos/                         # Task lists
```

### Core Entities

```typescript
// Session - a conversation with Claude
interface Session {
  id: string;
  slug: string;                    // Human-readable name
  projectPath: string;
  gitBranch: string;
  startedAt: Date;
  lastActivityAt: Date;
  messageCount: number;
  tokenUsage: { input: number; output: number; cacheRead: number };
  estimatedCost: number;           // USD cents
  toolsUsed: Map<string, number>;  // tool -> count
  skillsUsed: Map<string, number>; // skill -> count
  status: 'active' | 'idle' | 'archived';
}

// Message - single exchange in a session
interface Message {
  id: string;
  sessionId: string;
  parentId: string | null;
  role: 'user' | 'assistant';
  content: ContentBlock[];
  timestamp: Date;
  model?: string;
}

interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking';
  text?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  isError?: boolean;
}

// MCP Server configuration
interface McpServer {
  id: string;
  name: string;
  type: 'stdio' | 'http';
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
  enabled: boolean;
  source: string;                  // Config file path
  tools: string[];                 // Available tool names
}

// Skill definition
interface Skill {
  id: string;                      // e.g., "superpowers:brainstorming"
  name: string;
  plugin: string;
  path: string;
  description: string;
  triggers: string[];              // Slash commands
  usageCount: number;
  usageByDay: Map<string, number>;
  lastUsedAt: Date;
  avgSessionLength: number;
}
```

### Indexing Strategy

```typescript
interface SessionIndex {
  sessions: Map<string, SessionMeta>;      // Quick lookup
  messageOffsets: Map<string, number>;     // For lazy loading
  searchIndex: FlexSearch.Document;        // Full-text search
  toolUsageIndex: Map<string, string[]>;   // tool -> session IDs
  skillUsageIndex: Map<string, string[]>;  // skill -> session IDs
}
```

**Performance approach:**
- Parse session files lazily (metadata first, content on demand)
- Virtual scrolling for message lists
- Debounced file watching (batch updates)
- Persist index to disk for fast startup

---

## 3. UI Components

### Main Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Claude Dashboard                        [⌘K Search]  [⚙ Settings]│
├──────┬──────────────────────────────────────┬───────────────────┤
│ Nav  │           Main Content               │   Context Panel   │
│ Rail │                                      │                   │
│      │  (changes based on nav selection)    │  (contextual info │
│ 48px │                                      │   for selection)  │
│ wide │                                      │                   │
└──────┴──────────────────────────────────────┴───────────────────┘
```

### Navigation Rail

| Icon | View | Description |
|------|------|-------------|
| 💬 | Chat | Active conversation with Claude |
| 📁 | Sessions | Browse/search session history |
| 🔧 | Tools | MCP tools status and config |
| ⚡ | Skills | Browse and manage skills |
| 📊 | Stats | Usage analytics and costs |

### Component Tree

```
App
├── TitleBar (draggable, window controls)
├── CommandPalette (⌘K modal)
├── Layout
│   ├── NavRail
│   ├── MainContent
│   │   ├── ChatView
│   │   │   ├── MessageList (virtual scroll)
│   │   │   │   └── MessageBubble
│   │   │   │       ├── TextContent (markdown)
│   │   │   │       ├── ToolChip (expandable)
│   │   │   │       └── ThinkingBlock (collapsible)
│   │   │   └── ChatInput
│   │   ├── SessionsView
│   │   │   ├── SessionFilters (date, project, search)
│   │   │   └── SessionList → SessionCard
│   │   ├── ToolsView
│   │   │   ├── McpServerList → McpServerCard
│   │   │   └── BuiltinToolsList
│   │   ├── SkillsView
│   │   │   ├── SkillList (grouped by plugin)
│   │   │   └── SkillDetail (markdown preview)
│   │   └── StatsView
│   │       ├── UsageSummary (tokens, cost)
│   │       └── UsageCharts
│   └── ContextPanel
│       ├── SessionInfo
│       ├── ActiveTools
│       └── QuickActions
└── Toasts
```

### Key Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` | Command palette (search everything) |
| `⌘1-5` | Switch views |
| `⌘N` | New chat session |
| `⌘Enter` | Send message |
| `Esc` | Close panels/modals |

---

## 4. Chat Integration

### Approach: Claude CLI Subprocess

Rather than implementing the full Claude API client, we spawn the `claude` CLI process. This reuses existing authentication and gets all Claude Code features for free.

```typescript
// electron/services/ChatService.ts
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

export class ChatService extends EventEmitter {
  private process: ChildProcess | null = null;
  private projectPath: string;

  constructor(projectPath: string) {
    super();
    this.projectPath = projectPath;
  }

  async start(): Promise<void> {
    this.process = spawn('claude', ['--print', '--output-format', 'stream-json'], {
      cwd: this.projectPath,
      env: { ...process.env, FORCE_COLOR: '0' }
    });

    this.process.stdout?.on('data', (chunk) => {
      this.emit('response', this.parseChunk(chunk));
    });

    this.process.stderr?.on('data', (chunk) => {
      this.emit('error', chunk.toString());
    });

    this.process.on('exit', (code) => {
      this.emit('exit', code);
    });
  }

  send(message: string): void {
    this.process?.stdin?.write(message + '\n');
  }

  stop(): void {
    this.process?.kill();
    this.process = null;
  }

  private parseChunk(chunk: Buffer): StreamEvent {
    return JSON.parse(chunk.toString());
  }
}
```

### Stream Events

```typescript
type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_use'; name: string; input: object }
  | { type: 'tool_result'; output: string; isError: boolean }
  | { type: 'thinking'; content: string }
  | { type: 'done'; tokenUsage: TokenUsage };
```

### UI Integration

```typescript
// src/hooks/useChat.ts
export function useChat(projectPath: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const chatService = useRef<ChatService>();

  const sendMessage = useCallback(async (text: string) => {
    setIsStreaming(true);
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    chatService.current?.send(text);
  }, []);

  useEffect(() => {
    chatService.current = new ChatService(projectPath);

    chatService.current.on('response', (event) => {
      setMessages(prev => appendToLastAssistant(prev, event));
    });

    chatService.current.on('done', () => setIsStreaming(false));

    chatService.current.start();
    return () => chatService.current?.stop();
  }, [projectPath]);

  return { messages, sendMessage, isStreaming };
}
```

### Session Continuity

```typescript
// Resume existing session
spawn('claude', ['--resume', sessionId, '--print', '--output-format', 'stream-json'])
```

---

## 5. MCP Tools & Skills Management

### MCP Configuration Service

```typescript
// electron/services/McpConfigService.ts
export class McpConfigService {
  private configPaths = [
    '~/.claude/settings.json',           // User-level
    './.mcp.json',                        // Project-level
    '~/.claude/plugins/**/.mcp.json'     // Plugin-level
  ];

  async getAllServers(): Promise<McpServer[]> {
    const configs = await this.loadAllConfigs();
    return this.mergeConfigs(configs);
  }

  async toggleServer(serverId: string, enabled: boolean): Promise<void> {
    const config = await this.findConfigForServer(serverId);
    await this.writeConfig(config.path, {
      ...config.data,
      disabledMcpServers: enabled
        ? config.data.disabledMcpServers?.filter(s => s !== serverId)
        : [...(config.data.disabledMcpServers || []), serverId]
    });
  }

  async updateServerConfig(serverId: string, config: McpServerConfig): Promise<void> {
    // Write to appropriate .mcp.json
  }
}
```

### Skill Discovery Service

```typescript
// electron/services/SkillService.ts
export class SkillService {
  async discoverSkills(): Promise<Skill[]> {
    const skillDirs = await glob('~/.claude/plugins/cache/*/skills/*');

    return Promise.all(skillDirs.map(async (dir) => {
      const files = await fs.readdir(dir);
      const mdFile = files.find(f => f.endsWith('.md'));
      const content = await fs.readFile(path.join(dir, mdFile), 'utf8');

      return {
        id: this.parseSkillId(dir),
        name: this.parseSkillName(content),
        description: this.parseDescription(content),
        plugin: this.parsePlugin(dir),
        path: dir
      };
    }));
  }

  async getUsageStats(sessionIndex: SessionIndex): Promise<SkillUsage[]> {
    const skillCalls = sessionIndex.searchIndex.search({
      query: 'Skill',
      field: 'toolName'
    });

    return this.aggregateBySkill(skillCalls);
  }
}
```

### Skill Invocation

```typescript
const invokeSkill = (skillId: string) => {
  const command = `/${skillId.split(':').pop()}`; // e.g., "/brainstorming"
  chatService.send(command);
  navigateTo('chat');
};
```

---

## 6. Stats & Cost Tracking

### Cost Calculation

```typescript
// electron/services/CostService.ts

const PRICING = {
  'claude-opus-4-5-20251101': { input: 15, output: 75, cacheRead: 1.5 },
  'claude-sonnet-4-5-20250929': { input: 3, output: 15, cacheRead: 0.3 },
  'claude-haiku-4-5-20251001': { input: 0.8, output: 4, cacheRead: 0.08 }
};

export function calculateCost(usage: TokenUsage, model: string): number {
  const rates = PRICING[model] || PRICING['claude-sonnet-4-5-20250929'];

  const inputCost = (usage.input / 1_000_000) * rates.input;
  const outputCost = (usage.output / 1_000_000) * rates.output;
  const cacheCost = (usage.cacheRead / 1_000_000) * rates.cacheRead;

  return inputCost + outputCost + cacheCost;
}

export class CostService {
  async getUsageByPeriod(period: 'day' | 'week' | 'month'): Promise<UsageStats> {
    const sessions = await this.sessionService.getSessionsInPeriod(period);

    return {
      totalCost: sessions.reduce((sum, s) => sum + s.estimatedCost, 0),
      totalTokens: sessions.reduce((sum, s) => sum + s.tokenUsage.total, 0),
      sessionCount: sessions.length,
      byModel: this.aggregateByModel(sessions),
      byProject: this.aggregateByProject(sessions),
      byDay: this.aggregateByDay(sessions)
    };
  }
}
```

### Stats Dashboard Metrics

- **Summary cards:** Total cost, tokens, sessions, commits via Claude
- **Token usage chart:** Daily breakdown by input/output/cache
- **Cost by model:** Pie chart of spending across Opus/Sonnet/Haiku
- **Tool usage:** Bar chart of most-used tools
- **Top projects:** Ranked by cost/tokens/sessions

### Export Functionality

```typescript
async function exportStats(period: string, format: 'csv' | 'json'): Promise<void> {
  const stats = await costService.getUsageByPeriod(period);

  if (format === 'csv') {
    const csv = [
      'Date,Sessions,Input Tokens,Output Tokens,Cost USD',
      ...stats.byDay.map(d =>
        `${d.date},${d.sessions},${d.input},${d.output},${d.cost.toFixed(2)}`
      )
    ].join('\n');

    await dialog.showSaveDialog({ defaultPath: `claude-usage-${period}.csv` });
  }
}
```

---

## 7. File Structure

```
claude-ui/
├── electron/
│   ├── main.ts                    # Main process entry
│   ├── preload.ts                 # Secure IPC bridge
│   └── services/
│       ├── FileWatcher.ts         # chokidar wrapper
│       ├── SessionParser.ts       # JSONL parsing
│       ├── IndexService.ts        # Search indexing
│       ├── ChatService.ts         # CLI integration
│       ├── McpConfigService.ts    # MCP management
│       ├── SkillService.ts        # Skill discovery
│       └── CostService.ts         # Usage analytics
├── src/
│   ├── App.tsx
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TitleBar.tsx
│   │   │   ├── NavRail.tsx
│   │   │   ├── ContextPanel.tsx
│   │   │   └── CommandPalette.tsx
│   │   ├── chat/
│   │   │   ├── ChatView.tsx
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── ToolChip.tsx
│   │   │   └── ChatInput.tsx
│   │   ├── sessions/
│   │   │   ├── SessionsView.tsx
│   │   │   ├── SessionList.tsx
│   │   │   ├── SessionCard.tsx
│   │   │   └── SessionFilters.tsx
│   │   ├── tools/
│   │   │   ├── ToolsView.tsx
│   │   │   ├── McpServerList.tsx
│   │   │   └── McpServerCard.tsx
│   │   ├── skills/
│   │   │   ├── SkillsView.tsx
│   │   │   ├── SkillList.tsx
│   │   │   ├── SkillCard.tsx
│   │   │   └── SkillDetail.tsx
│   │   └── stats/
│   │       ├── StatsView.tsx
│   │       ├── UsageSummary.tsx
│   │       └── UsageCharts.tsx
│   ├── stores/
│   │   ├── sessions.ts
│   │   ├── settings.ts
│   │   └── ui.ts
│   ├── hooks/
│   │   ├── useChat.ts
│   │   ├── useSessions.ts
│   │   ├── useSkills.ts
│   │   └── useStats.ts
│   └── lib/
│       ├── ipc.ts                 # Electron IPC helpers
│       └── cost.ts                # Cost calculation
├── package.json
├── electron-builder.yml
├── tailwind.config.js
└── tsconfig.json
```

---

## 8. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Electron + React + Tailwind setup
- [ ] Main process file watching
- [ ] Session parsing and indexing
- [ ] Basic session list view

### Phase 2: Session History (Week 2)
- [ ] Message list with virtual scrolling
- [ ] Full-text search across sessions
- [ ] Session filtering (date, project)
- [ ] Context panel with session info

### Phase 3: Chat Integration (Week 3)
- [ ] Claude CLI subprocess management
- [ ] Streaming response rendering
- [ ] Tool chips with expand/collapse
- [ ] Session resume functionality

### Phase 4: Tools & Skills (Week 3-4)
- [ ] MCP server discovery and display
- [ ] Toggle MCP servers on/off
- [ ] Skill discovery and listing
- [ ] Skill usage tracking
- [ ] Invoke skill from UI

### Phase 5: Stats & Polish (Week 4)
- [ ] Usage statistics dashboard
- [ ] Cost tracking and charts
- [ ] CSV/JSON export
- [ ] Command palette
- [ ] Keyboard shortcuts
- [ ] Dark mode (default)

---

## 9. Open Questions

1. **Session sync** - Should we watch for external changes while app is open, or require refresh?
2. **Multi-window** - Support multiple chat windows for different projects?
3. **Plugin system** - Allow third-party extensions to the dashboard?
4. **Notifications** - Desktop notifications for long-running tasks?

---

## 10. References

- [Claude Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)
- [Claude Code Analytics API](https://platform.claude.com/docs/en/build-with-claude/claude-code-analytics-api)
- [Electron Documentation](https://www.electronjs.org/docs)
- [TanStack Query](https://tanstack.com/query)
- [FlexSearch](https://github.com/nextapps-de/flexsearch)
