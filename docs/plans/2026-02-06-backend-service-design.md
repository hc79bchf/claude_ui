# Backend Service Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a Node.js backend service that provides REST API and WebSocket endpoints for the Claude Dashboard browser UI, replacing Electron IPC.

**Architecture:** Express server with WebSocket support. Reuses existing service classes from `electron/services/`. FileWatcher pushes session updates via WebSocket. Chat spawns Claude CLI and streams output.

**Tech Stack:** Node.js, Express, WebSocket (ws), TypeScript

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React UI)                       │
│                    http://localhost:5173                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
            REST API      │      WebSocket
            (HTTP)        │      (WS)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Express Server (:3001)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ REST Routes │  │  WebSocket  │  │   File Watcher      │  │
│  │ /sessions   │  │  /chat      │  │   (session updates) │  │
│  │ /stats      │  │             │  │                     │  │
│  │ /mcp        │  │             │  │                     │  │
│  │ /skills     │  │             │  │                     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         ▼                ▼                     ▼             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │                   Shared Services                        ││
│  │  SessionParser │ CostService │ McpConfig │ SkillService ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
              ~/.claude/projects/*.jsonl
              ~/.claude/settings.json
```

## API Endpoints

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/sessions` | List all sessions |
| GET | `/api/sessions/:id` | Get session details + messages |
| GET | `/api/stats?period=week` | Usage stats (today\|week\|month\|all) |
| GET | `/api/mcp-servers` | List MCP servers |
| POST | `/api/mcp-servers/:id/toggle` | Toggle MCP server |
| GET | `/api/skills` | List discovered skills |

### WebSocket Events

**Client → Server:**
```json
{ "type": "chat:start", "projectPath": "/path/to/project" }
{ "type": "chat:message", "content": "Help me..." }
{ "type": "chat:stop" }
{ "type": "subscribe:sessions" }
```

**Server → Client:**
```json
{ "type": "chat:text", "content": "..." }
{ "type": "chat:thinking", "content": "..." }
{ "type": "chat:tool_use", "name": "Read", "input": {} }
{ "type": "chat:tool_result", "output": "..." }
{ "type": "chat:done" }
{ "type": "chat:error", "message": "..." }
{ "type": "session:update", "session": {} }
```

## File Structure

```
server/
├── package.json
├── tsconfig.json
├── Dockerfile
├── src/
│   ├── index.ts              # Express + WebSocket setup
│   ├── routes/
│   │   ├── sessions.ts
│   │   ├── stats.ts
│   │   ├── mcp.ts
│   │   └── skills.ts
│   ├── websocket/
│   │   └── handler.ts
│   └── services/             # Copied from electron/services/
│       ├── SessionParser.ts
│       ├── FileWatcher.ts
│       ├── ChatService.ts
│       ├── McpConfigService.ts
│       ├── SkillService.ts
│       ├── CostService.ts
│       └── types.ts
```

## Container Deployment

**docker-compose.yml:**
```yaml
services:
  frontend:
    build: .
    ports:
      - "8080:80"
    depends_on:
      - backend

  backend:
    build: ./server
    ports:
      - "3001:3001"
    volumes:
      - ~/.claude:/root/.claude:ro
```

---

## Implementation Tasks

### Task 1: Server Project Setup

**Files:**
- Create: `server/package.json`
- Create: `server/tsconfig.json`
- Create: `server/src/index.ts`

**Step 1: Create server directory and package.json**

```bash
mkdir -p server/src
```

Create `server/package.json`:
```json
{
  "name": "claude-dashboard-server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "ws": "^8.16.0",
    "chokidar": "^3.5.3",
    "glob": "^10.3.10"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/cors": "^2.8.17",
    "@types/ws": "^8.5.10",
    "@types/node": "^20.11.0",
    "typescript": "^5.3.3",
    "tsx": "^4.7.0"
  }
}
```

**Step 2: Create tsconfig.json**

Create `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

**Step 3: Create basic Express server with health endpoint**

Create `server/src/index.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('close', () => console.log('WebSocket client disconnected'));
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
```

**Step 4: Install dependencies and verify**

```bash
cd server && npm install
```

**Step 5: Run server and test health endpoint**

Run: `cd server && npm run dev`
Test: `curl http://localhost:3001/api/health`
Expected: `{"status":"ok","timestamp":"..."}`

**Step 6: Commit**

```bash
git add server/
git commit -m "feat(server): add Express server with health endpoint and WebSocket"
```

---

### Task 2: Copy and Adapt Services

**Files:**
- Copy: `electron/services/*.ts` → `server/src/services/`
- Modify: Import paths in copied services

**Step 1: Copy service files**

```bash
mkdir -p server/src/services
cp electron/services/types.ts server/src/services/
cp electron/services/SessionParser.ts server/src/services/
cp electron/services/FileWatcher.ts server/src/services/
cp electron/services/ChatService.ts server/src/services/
cp electron/services/McpConfigService.ts server/src/services/
cp electron/services/SkillService.ts server/src/services/
cp electron/services/CostService.ts server/src/services/
```

**Step 2: Create shared types file for server**

Create `server/src/services/shared-types.ts`:
```typescript
// MCP types (from src/types/mcp.ts)
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

// Skill types (from src/types/skill.ts)
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

// Usage stats types (from src/types/index.ts)
export interface UsageStats {
  totalCost: number;
  totalTokens: number;
  sessionCount: number;
  byModel: Record<string, { tokens: number; cost: number }>;
  byProject: Array<{ path: string; cost: number; sessions: number }>;
  byDay: Array<{ date: string; tokens: number; cost: number; sessions: number }>;
}
```

**Step 3: Update McpConfigService imports**

In `server/src/services/McpConfigService.ts`, change:
```typescript
// FROM:
import type { McpServer, McpConfig, McpServerConfig } from '../../src/types/mcp';

// TO:
import type { McpServer, McpConfig, McpServerConfig } from './shared-types.js';
```

**Step 4: Update SkillService imports**

In `server/src/services/SkillService.ts`, change:
```typescript
// FROM:
import type { Skill } from '../../src/types/skill';
import type { RawSessionMessage } from './types';

// TO:
import type { Skill } from './shared-types.js';
import type { RawSessionMessage } from './types.js';
```

**Step 5: Update CostService imports**

In `server/src/services/CostService.ts`, change:
```typescript
// FROM:
import { ParsedSession } from './types';
import { UsageStats } from '../../src/types';

// TO:
import { ParsedSession } from './types.js';
import { UsageStats } from './shared-types.js';
```

**Step 6: Add .js extensions to all local imports**

Update all service files to use `.js` extensions for ESM compatibility:
- `types.js` instead of `./types`
- `shared-types.js` instead of `./shared-types`

**Step 7: Verify TypeScript compiles**

```bash
cd server && npx tsc --noEmit
```
Expected: No errors

**Step 8: Commit**

```bash
git add server/src/services/
git commit -m "feat(server): copy and adapt services from electron"
```

---

### Task 3: Sessions REST Routes

**Files:**
- Create: `server/src/routes/sessions.ts`
- Modify: `server/src/index.ts`

**Step 1: Create sessions route**

Create `server/src/routes/sessions.ts`:
```typescript
import { Router } from 'express';
import { glob } from 'glob';
import * as path from 'path';
import * as os from 'os';
import { SessionParser } from '../services/SessionParser.js';

const router = Router();
const sessionParser = new SessionParser();

// GET /api/sessions - List all sessions
router.get('/', async (req, res) => {
  try {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');
    const sessionFiles = await glob(path.join(claudeDir, '**/*.jsonl'));

    const sessions = sessionFiles
      .map(file => sessionParser.parseSessionFile(file))
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime());

    res.json(sessions);
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// GET /api/sessions/:id - Get session details with messages
router.get('/:id', async (req, res) => {
  try {
    const claudeDir = path.join(os.homedir(), '.claude', 'projects');
    const sessionFiles = await glob(path.join(claudeDir, '**/*.jsonl'));

    for (const file of sessionFiles) {
      const session = sessionParser.parseSessionFile(file);
      if (session && session.id === req.params.id) {
        const messages = sessionParser.getSessionMessages(file);
        return res.json({ session, messages });
      }
    }

    res.status(404).json({ error: 'Session not found' });
  } catch (error) {
    console.error('Error getting session:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

export default router;
```

**Step 2: Register route in index.ts**

Add to `server/src/index.ts`:
```typescript
import sessionsRouter from './routes/sessions.js';

// After app.use(express.json());
app.use('/api/sessions', sessionsRouter);
```

**Step 3: Test sessions endpoint**

Run: `curl http://localhost:3001/api/sessions`
Expected: JSON array of sessions (or empty array if no ~/.claude/projects)

**Step 4: Commit**

```bash
git add server/src/routes/sessions.ts server/src/index.ts
git commit -m "feat(server): add sessions REST endpoints"
```

---

### Task 4: Stats REST Route

**Files:**
- Create: `server/src/routes/stats.ts`
- Modify: `server/src/index.ts`

**Step 1: Create stats route**

Create `server/src/routes/stats.ts`:
```typescript
import { Router } from 'express';
import { glob } from 'glob';
import * as path from 'path';
import * as os from 'os';
import { SessionParser } from '../services/SessionParser.js';
import { CostService, TimePeriod } from '../services/CostService.js';

const router = Router();
const sessionParser = new SessionParser();
const costService = new CostService();

// GET /api/stats?period=week
router.get('/', async (req, res) => {
  try {
    const period = (req.query.period as TimePeriod) || 'week';

    const claudeDir = path.join(os.homedir(), '.claude', 'projects');
    const sessionFiles = await glob(path.join(claudeDir, '**/*.jsonl'));

    const sessions = sessionFiles
      .map(file => sessionParser.parseSessionFile(file))
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const stats = costService.aggregateStats(sessions, period);
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;
```

**Step 2: Register route in index.ts**

Add to `server/src/index.ts`:
```typescript
import statsRouter from './routes/stats.js';

app.use('/api/stats', statsRouter);
```

**Step 3: Test stats endpoint**

Run: `curl "http://localhost:3001/api/stats?period=week"`
Expected: JSON with totalCost, totalTokens, sessionCount, byModel, byProject, byDay

**Step 4: Commit**

```bash
git add server/src/routes/stats.ts server/src/index.ts
git commit -m "feat(server): add stats REST endpoint"
```

---

### Task 5: MCP Servers REST Routes

**Files:**
- Create: `server/src/routes/mcp.ts`
- Modify: `server/src/index.ts`

**Step 1: Create MCP route**

Create `server/src/routes/mcp.ts`:
```typescript
import { Router } from 'express';
import { McpConfigService } from '../services/McpConfigService.js';

const router = Router();
const mcpService = new McpConfigService();

// GET /api/mcp-servers
router.get('/', async (req, res) => {
  try {
    const servers = await mcpService.getMcpServers();
    res.json(servers);
  } catch (error) {
    console.error('Error getting MCP servers:', error);
    res.status(500).json({ error: 'Failed to get MCP servers' });
  }
});

// POST /api/mcp-servers/:id/toggle
router.post('/:id/toggle', async (req, res) => {
  try {
    const { enabled } = req.body;
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    await mcpService.toggleMcpServer(req.params.id, enabled);
    res.json({ success: true });
  } catch (error) {
    console.error('Error toggling MCP server:', error);
    res.status(500).json({ error: 'Failed to toggle MCP server' });
  }
});

export default router;
```

**Step 2: Register route in index.ts**

Add to `server/src/index.ts`:
```typescript
import mcpRouter from './routes/mcp.js';

app.use('/api/mcp-servers', mcpRouter);
```

**Step 3: Test MCP endpoint**

Run: `curl http://localhost:3001/api/mcp-servers`
Expected: JSON array of MCP servers

**Step 4: Commit**

```bash
git add server/src/routes/mcp.ts server/src/index.ts
git commit -m "feat(server): add MCP servers REST endpoints"
```

---

### Task 6: Skills REST Route

**Files:**
- Create: `server/src/routes/skills.ts`
- Modify: `server/src/index.ts`

**Step 1: Create skills route**

Create `server/src/routes/skills.ts`:
```typescript
import { Router } from 'express';
import { SkillService } from '../services/SkillService.js';

const router = Router();
const skillService = new SkillService();

// GET /api/skills
router.get('/', async (req, res) => {
  try {
    const skills = await skillService.getSkills();
    res.json(skills);
  } catch (error) {
    console.error('Error getting skills:', error);
    res.status(500).json({ error: 'Failed to get skills' });
  }
});

export default router;
```

**Step 2: Register route in index.ts**

Add to `server/src/index.ts`:
```typescript
import skillsRouter from './routes/skills.js';

app.use('/api/skills', skillsRouter);
```

**Step 3: Test skills endpoint**

Run: `curl http://localhost:3001/api/skills`
Expected: JSON array of discovered skills

**Step 4: Commit**

```bash
git add server/src/routes/skills.ts server/src/index.ts
git commit -m "feat(server): add skills REST endpoint"
```

---

### Task 7: WebSocket Handler

**Files:**
- Create: `server/src/websocket/handler.ts`
- Modify: `server/src/index.ts`

**Step 1: Create WebSocket handler**

Create `server/src/websocket/handler.ts`:
```typescript
import { WebSocket, WebSocketServer } from 'ws';
import { FileWatcher } from '../services/FileWatcher.js';
import { ChatService } from '../services/ChatService.js';
import { SessionParser } from '../services/SessionParser.js';

interface WSMessage {
  type: string;
  [key: string]: unknown;
}

export function setupWebSocket(wss: WebSocketServer) {
  const fileWatcher = new FileWatcher();
  const sessionParser = new SessionParser();
  const chatServices = new Map<WebSocket, ChatService>();

  fileWatcher.start();

  // Broadcast session updates to all subscribed clients
  const sessionSubscribers = new Set<WebSocket>();

  fileWatcher.on('session-changed', (filePath: string) => {
    const session = sessionParser.parseSessionFile(filePath);
    if (session) {
      const message = JSON.stringify({ type: 'session:update', session });
      sessionSubscribers.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString());

        switch (msg.type) {
          case 'subscribe:sessions':
            sessionSubscribers.add(ws);
            break;

          case 'chat:start': {
            const projectPath = msg.projectPath as string;
            if (!projectPath) {
              ws.send(JSON.stringify({ type: 'chat:error', message: 'projectPath required' }));
              return;
            }

            const chat = new ChatService(projectPath);
            chatServices.set(ws, chat);

            chat.on('event', (event) => {
              ws.send(JSON.stringify({ type: `chat:${event.type}`, ...event }));
            });

            chat.on('exit', (code) => {
              ws.send(JSON.stringify({ type: 'chat:exit', code }));
              chatServices.delete(ws);
            });

            await chat.start();
            break;
          }

          case 'chat:message': {
            const chat = chatServices.get(ws);
            if (chat) {
              chat.send(msg.content as string);
            }
            break;
          }

          case 'chat:stop': {
            const chat = chatServices.get(ws);
            if (chat) {
              chat.stop();
              chatServices.delete(ws);
            }
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      sessionSubscribers.delete(ws);

      const chat = chatServices.get(ws);
      if (chat) {
        chat.stop();
        chatServices.delete(ws);
      }
    });
  });

  return { fileWatcher };
}
```

**Step 2: Update index.ts to use handler**

Update `server/src/index.ts`:
```typescript
import { setupWebSocket } from './websocket/handler.js';

// Replace the simple wss.on('connection') with:
setupWebSocket(wss);
```

**Step 3: Test WebSocket connection**

Use wscat or browser console:
```javascript
const ws = new WebSocket('ws://localhost:3001');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.onopen = () => ws.send(JSON.stringify({ type: 'subscribe:sessions' }));
```

**Step 4: Commit**

```bash
git add server/src/websocket/handler.ts server/src/index.ts
git commit -m "feat(server): add WebSocket handler for chat and session updates"
```

---

### Task 8: Frontend API Integration

**Files:**
- Modify: `src/lib/electron.ts`

**Step 1: Add backend API detection and client**

Update `src/lib/electron.ts` to detect and use backend:

```typescript
// Add at the top of the file
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const WS_URL = BACKEND_URL.replace('http', 'ws');

// Check if backend is available
async function isBackendAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

// Backend API implementation
const backendAPI: ElectronAPI = {
  getSessions: async () => {
    const res = await fetch(`${BACKEND_URL}/api/sessions`);
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
    return res.json();
  },
  getStats: async (period) => {
    const res = await fetch(`${BACKEND_URL}/api/stats?period=${period}`);
    return res.json();
  },
  startChat: async (projectPath) => {
    // WebSocket chat handled separately
  },
  sendMessage: async (message) => {
    // WebSocket chat handled separately
  },
  onChatResponse: (callback) => () => {},
  onChatExit: (callback) => () => {},
  stopChat: async () => {},
};

// Update the export to try backend first
let cachedAPI: ElectronAPI | null = null;

export async function getAPI(): Promise<ElectronAPI> {
  if (cachedAPI) return cachedAPI;

  if (window.electronAPI) {
    cachedAPI = window.electronAPI;
  } else if (await isBackendAvailable()) {
    cachedAPI = backendAPI;
  } else {
    cachedAPI = mockAPI;
  }

  return cachedAPI;
}

// For backwards compatibility, export the synchronous version
export const electronAPI: ElectronAPI = window.electronAPI ?? mockAPI;
```

**Step 2: Update hooks to use async API**

This requires updating hooks like `useSessions.ts` to handle the async API detection. For now, the synchronous fallback works.

**Step 3: Test with backend running**

1. Start backend: `cd server && npm run dev`
2. Start frontend: `npm run dev`
3. Open http://localhost:5173
4. Check Network tab - requests should go to :3001

**Step 4: Commit**

```bash
git add src/lib/electron.ts
git commit -m "feat(frontend): add backend API integration with fallback"
```

---

### Task 9: Docker Setup

**Files:**
- Create: `Dockerfile` (frontend)
- Create: `server/Dockerfile` (backend)
- Create: `docker-compose.yml`
- Create: `nginx.conf`

**Step 1: Create frontend Dockerfile**

Create `Dockerfile`:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Step 2: Create nginx.conf**

Create `nginx.conf`:
```nginx
server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # WebSocket proxy
    location /ws {
        proxy_pass http://backend:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

**Step 3: Create backend Dockerfile**

Create `server/Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["node", "dist/index.js"]
```

**Step 4: Create docker-compose.yml**

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "8080:80"
    depends_on:
      - backend

  backend:
    build: ./server
    ports:
      - "3001:3001"
    volumes:
      - ~/.claude:/root/.claude:ro
    environment:
      - NODE_ENV=production
```

**Step 5: Test Docker build**

```bash
docker-compose build
docker-compose up -d
curl http://localhost:8080/api/health
```

**Step 6: Commit**

```bash
git add Dockerfile nginx.conf server/Dockerfile docker-compose.yml
git commit -m "feat: add Docker deployment configuration"
```

---

### Task 10: Development Scripts

**Files:**
- Modify: `package.json` (root)

**Step 1: Add dev:web script**

Update root `package.json` scripts:
```json
{
  "scripts": {
    "dev": "vite",
    "dev:web": "concurrently \"cd server && npm run dev\" \"npm run dev\"",
    "build": "tsc -b && vite build",
    "build:all": "npm run build && cd server && npm run build",
    "preview": "vite preview"
  }
}
```

**Step 2: Install concurrently**

```bash
npm install -D concurrently
```

**Step 3: Test dev:web script**

```bash
npm run dev:web
```
Expected: Both server and frontend start together

**Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add dev:web script for full-stack development"
```

---

## Final Verification

After all tasks:

1. **REST API:**
   - `curl http://localhost:3001/api/health` → `{"status":"ok"}`
   - `curl http://localhost:3001/api/sessions` → Session list
   - `curl http://localhost:3001/api/stats?period=week` → Usage stats
   - `curl http://localhost:3001/api/mcp-servers` → MCP servers
   - `curl http://localhost:3001/api/skills` → Skills list

2. **WebSocket:**
   - Connect to `ws://localhost:3001`
   - Send `{"type":"subscribe:sessions"}` → Receive session updates

3. **Docker:**
   - `docker-compose up -d`
   - Access http://localhost:8080
   - Verify API calls work through nginx proxy
