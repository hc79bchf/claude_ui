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
    const listener = (_event: any, data: unknown) => callback(data);
    ipcRenderer.on('chat-response', listener);
    return () => ipcRenderer.removeListener('chat-response', listener);
  },
  onChatExit: (callback: (code: number) => void) => {
    const listener = (_event: any, code: number) => callback(code);
    ipcRenderer.on('chat-exit', listener);
    return () => ipcRenderer.removeListener('chat-exit', listener);
  },
  stopChat: () => ipcRenderer.invoke('stop-chat'),

  // MCP & Skills
  getMcpServers: () => ipcRenderer.invoke('get-mcp-servers'),
  toggleMcpServer: (id: string, enabled: boolean) => ipcRenderer.invoke('toggle-mcp-server', id, enabled),
  getSkills: () => ipcRenderer.invoke('get-skills'),

  // Stats
  getStats: (period: 'today' | 'week' | 'month' | 'all') => ipcRenderer.invoke('get-stats', period),
});
