import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Sessions
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  getSession: (id: string) => ipcRenderer.invoke('get-session', id),

  // File watching
  onSessionUpdate: (callback: (data: unknown) => void) => {
    ipcRenderer.on('session-update', (_event, data) => callback(data));
  },

  // Chat
  startChat: (projectPath: string) => ipcRenderer.invoke('start-chat', projectPath),
  sendMessage: (message: string) => ipcRenderer.invoke('send-message', message),
  onChatResponse: (callback: (data: unknown) => void) => {
    ipcRenderer.on('chat-response', (_event, data) => callback(data));
  },
  onChatExit: (callback: (code: number) => void) => {
    ipcRenderer.on('chat-exit', (_event, code) => callback(code));
  },
  stopChat: () => ipcRenderer.invoke('stop-chat'),

  // MCP & Skills
  getMcpServers: () => ipcRenderer.invoke('get-mcp-servers'),
  toggleMcpServer: (id: string, enabled: boolean) => ipcRenderer.invoke('toggle-mcp-server', id, enabled),
  getSkills: () => ipcRenderer.invoke('get-skills'),

  // Stats
  getStats: (period: string) => ipcRenderer.invoke('get-stats', period),
});
