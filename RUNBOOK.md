# Claude Dashboard Runbook

## Prerequisites

- Node.js 20+
- Docker Desktop
- Claude CLI installed and authenticated (`claude --version`)

## Quick Start

### 1. Start Backend (on host)

The backend runs on your host machine to access Claude CLI with your subscription.

```bash
cd server
npm install
npm run build
npm start
```

Backend will be available at `http://localhost:3001`

### 2. Start Frontend (Docker)

```bash
docker-compose up -d
```

Frontend will be available at `http://localhost:8080`

## Development Mode

### Backend (with hot reload)

```bash
cd server
npm install
npm run dev
```

### Frontend (with hot reload)

```bash
npm install
npm run dev
```

Frontend dev server at `http://localhost:5173`

## Stop Services

### Stop Frontend (Docker)

```bash
docker-compose down
```

### Stop Backend

Press `Ctrl+C` in the terminal running the backend, or:

```bash
pkill -f "node dist/index.js"
```

## Architecture

```
Browser (localhost:8080)
    │
    ▼
Docker nginx (frontend)
    │ proxy to host.docker.internal:3001
    ▼
Host backend (Node.js + Express)
    │ spawns
    ▼
Claude CLI (with subscription auth)
```

## Troubleshooting

### Backend not responding

```bash
# Check if backend is running
curl http://localhost:3001/api/health

# Check logs
cd server && npm start
```

### Frontend can't connect to backend

```bash
# Verify Docker can reach host
docker run --rm alpine ping -c 1 host.docker.internal

# Rebuild frontend with new nginx config
docker-compose build frontend
docker-compose up -d
```

### Claude CLI not authenticated

```bash
# Check Claude CLI status
claude --version

# Re-authenticate if needed
claude login
```

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check |
| `GET /api/sessions` | List all sessions |
| `GET /api/sessions/:id` | Get session details |
| `GET /api/stats?period=week` | Usage statistics |
| `GET /api/mcp-servers` | List MCP servers |
| `GET /api/skills` | List available skills |
| `GET /api/filesystem/list?path=...` | Browse directories |
| `WS /` | WebSocket for chat |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend port |
| `NODE_ENV` | `development` | Environment mode |
