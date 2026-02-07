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
│   │   └── chatHandler.ts
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

## Implementation Tasks

### Task 1: Server Setup
- Create `server/` directory with package.json, tsconfig.json
- Install dependencies: express, ws, cors, chokidar, glob
- Create `src/index.ts` with Express + WebSocket server

### Task 2: Copy Services
- Copy services from `electron/services/` to `server/src/services/`
- Adjust imports for new structure

### Task 3: REST Routes
- Implement `/api/sessions` routes
- Implement `/api/stats` routes
- Implement `/api/mcp-servers` routes
- Implement `/api/skills` routes
- Add `/api/health` endpoint

### Task 4: WebSocket Handler
- Implement chat WebSocket handler
- Integrate ChatService for Claude CLI spawning
- Integrate FileWatcher for session updates

### Task 5: Frontend Integration
- Update `src/lib/electron.ts` to detect and use backend API
- Add WebSocket client for chat and session updates
- Keep mock fallback for offline development

### Task 6: Docker Setup
- Create `Dockerfile` for frontend (nginx)
- Create `server/Dockerfile` for backend
- Create `docker-compose.yml`
- Create `nginx.conf` for API proxying

### Task 7: Testing & Scripts
- Add `dev:web` script to root package.json
- Test all endpoints manually
- Test WebSocket chat flow
- Test Docker deployment
