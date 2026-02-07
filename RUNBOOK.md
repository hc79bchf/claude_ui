# Claude Dashboard Runbook

## Prerequisites

- Docker Desktop
- Claude CLI authenticated on host (`claude --version`)

## Quick Start

### Start Dashboard

```bash
npm run docker:up
```

Or directly:

```bash
docker-compose up -d --build
```

- Frontend: http://localhost:8080
- Backend: http://localhost:3001

### Stop Dashboard

```bash
npm run docker:down
```

Or directly:

```bash
docker-compose down
```

## Architecture

```
Browser (localhost:8080)
    │
    ▼
Docker nginx (frontend container)
    │ proxy /api and /ws to backend:3001
    ▼
Docker backend (Node.js container)
    │ mounts ~/.claude for auth
    │ spawns via expect
    ▼
Claude CLI (uses host's Claude subscription)
```

## Container Details

| Service | Container | Port | Image |
|---------|-----------|------|-------|
| Frontend | claude_ui-frontend-1 | 8080:80 | nginx:alpine |
| Backend | claude_ui-backend-1 | 3001:3001 | node:20-alpine |

## View Logs

```bash
# All containers
docker-compose logs -f

# Frontend only
docker-compose logs -f frontend

# Backend only
docker-compose logs -f backend
```

## Rebuild After Changes

```bash
# Rebuild and restart
docker-compose up -d --build

# Force full rebuild (no cache)
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Check container status

```bash
docker-compose ps
```

### Backend not responding

```bash
# Check health
curl http://localhost:3001/api/health

# Check backend logs
docker-compose logs backend
```

### Frontend can't connect to backend

```bash
# Check nginx config
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf

# Rebuild frontend
docker-compose build frontend
docker-compose up -d frontend
```

### Claude CLI not authenticated

The backend container mounts `~/.claude` from your host. Ensure Claude CLI is authenticated:

```bash
# On host machine
claude --version
claude login  # if needed
```

Then restart the backend container:

```bash
docker-compose restart backend
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
| `WS /ws` | WebSocket for chat |

## Building for Production

```bash
# Build frontend and backend
npm run build:all

# Build Docker images
docker-compose build
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend port (in container) |
| `NODE_ENV` | `production` | Environment mode |
