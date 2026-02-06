import type { ParsedSession } from '../../electron/services/types';

export interface ChatEvent {
  type: 'text' | 'tool_use' | 'tool_result' | 'thinking' | 'done' | 'error';
  content?: string;
  toolName?: string;
  toolInput?: object;
  toolOutput?: string;
  isError?: boolean;
}

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
      onChatResponse: (callback: (data: ChatEvent) => void) => void;
      onChatExit: (callback: (code: number) => void) => void;
      stopChat: () => Promise<void>;
    };
  }
}

export const electronAPI = window.electronAPI;
