import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import sessionsRouter from './routes/sessions.js';
import statsRouter from './routes/stats.js';
import mcpRouter from './routes/mcp.js';
import skillsRouter from './routes/skills.js';
import { setupWebSocket } from './websocket/handler.js';

const parsedPort = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const PORT = isNaN(parsedPort) ? 3001 : parsedPort;

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/sessions', sessionsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/mcp-servers', mcpRouter);
app.use('/api/skills', skillsRouter);

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

setupWebSocket(wss);

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', error);
  }
  process.exit(1);
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
