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
              const { type, ...rest } = event;
              ws.send(JSON.stringify({ type: `chat:${type}`, ...rest }));
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
