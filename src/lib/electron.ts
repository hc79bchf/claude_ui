import type { ParsedSession } from '../../electron/services/types';

declare global {
  interface Window {
    electronAPI: {
      getSessions: () => Promise<ParsedSession[]>;
      getSession: (id: string) => Promise<{ session: ParsedSession; messages: unknown[] } | null>;
      onSessionUpdate: (callback: (data: ParsedSession) => void) => void;
      getMcpServers: () => Promise<unknown[]>;
      toggleMcpServer: (id: string, enabled: boolean) => Promise<void>;
      getSkills: () => Promise<unknown[]>;
      getStats: (period: string) => Promise<unknown>;
      startChat: (projectPath: string) => Promise<void>;
      sendMessage: (message: string) => Promise<void>;
      onChatResponse: (callback: (data: unknown) => void) => void;
    };
  }
}

export const electronAPI = window.electronAPI;
