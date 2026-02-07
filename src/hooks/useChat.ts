import { useState, useCallback, useEffect, useRef } from 'react';
import { getAPI, ChatEvent, ElectronAPI } from '../lib/electron';

export type ContentBlockType = 'text' | 'tool_use' | 'tool_result' | 'thinking';

export interface TextBlock {
  type: 'text';
  content: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  toolName: string;
  toolInput?: object;
}

export interface ToolResultBlock {
  type: 'tool_result';
  toolOutput?: string;
  isError?: boolean;
}

export interface ThinkingBlock {
  type: 'thinking';
  content: string;
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | ThinkingBlock;

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: ContentBlock[];
  timestamp: Date;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface UseChatReturn {
  messages: Message[];
  status: ConnectionStatus;
  isLoading: boolean;
  error: string | null;
  startChat: (projectPath: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  stopChat: () => Promise<void>;
  clearMessages: () => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<ElectronAPI | null>(null);

  // Track the current assistant message being built
  const currentAssistantMessageRef = useRef<Message | null>(null);

  // Initialize API
  useEffect(() => {
    getAPI().then(setApi);
  }, []);

  // Setup event listeners
  useEffect(() => {
    if (!api) return;
    const handleChatResponse = (event: ChatEvent) => {
      switch (event.type) {
        case 'text': {
          // If no current assistant message, create one
          if (!currentAssistantMessageRef.current) {
            const newMessage: Message = {
              id: generateId(),
              role: 'assistant',
              content: [],
              timestamp: new Date(),
            };
            currentAssistantMessageRef.current = newMessage;
            setMessages(prev => [...prev, newMessage]);
          }

          // Check if the last content block is a text block
          const currentMsg = currentAssistantMessageRef.current;
          const lastBlock = currentMsg.content[currentMsg.content.length - 1];

          if (lastBlock && lastBlock.type === 'text') {
            // Append to existing text block
            (lastBlock as TextBlock).content += event.content || '';
          } else {
            // Create new text block
            currentMsg.content.push({
              type: 'text',
              content: event.content || '',
            });
          }

          // Update messages state
          setMessages(prev =>
            prev.map(m => m.id === currentMsg.id ? { ...currentMsg } : m)
          );
          break;
        }

        case 'thinking': {
          if (!currentAssistantMessageRef.current) {
            const newMessage: Message = {
              id: generateId(),
              role: 'assistant',
              content: [],
              timestamp: new Date(),
            };
            currentAssistantMessageRef.current = newMessage;
            setMessages(prev => [...prev, newMessage]);
          }

          const currentMsg = currentAssistantMessageRef.current;
          const lastBlock = currentMsg.content[currentMsg.content.length - 1];

          if (lastBlock && lastBlock.type === 'thinking') {
            (lastBlock as ThinkingBlock).content += event.content || '';
          } else {
            currentMsg.content.push({
              type: 'thinking',
              content: event.content || '',
            });
          }

          setMessages(prev =>
            prev.map(m => m.id === currentMsg.id ? { ...currentMsg } : m)
          );
          break;
        }

        case 'tool_use': {
          if (!currentAssistantMessageRef.current) {
            const newMessage: Message = {
              id: generateId(),
              role: 'assistant',
              content: [],
              timestamp: new Date(),
            };
            currentAssistantMessageRef.current = newMessage;
            setMessages(prev => [...prev, newMessage]);
          }

          const currentMsg = currentAssistantMessageRef.current;
          currentMsg.content.push({
            type: 'tool_use',
            toolName: event.toolName || 'unknown',
            toolInput: event.toolInput,
          });

          setMessages(prev =>
            prev.map(m => m.id === currentMsg.id ? { ...currentMsg } : m)
          );
          break;
        }

        case 'tool_result': {
          if (!currentAssistantMessageRef.current) {
            const newMessage: Message = {
              id: generateId(),
              role: 'assistant',
              content: [],
              timestamp: new Date(),
            };
            currentAssistantMessageRef.current = newMessage;
            setMessages(prev => [...prev, newMessage]);
          }

          const currentMsg = currentAssistantMessageRef.current;
          currentMsg.content.push({
            type: 'tool_result',
            toolOutput: event.toolOutput,
            isError: event.isError,
          });

          setMessages(prev =>
            prev.map(m => m.id === currentMsg.id ? { ...currentMsg } : m)
          );
          break;
        }

        case 'done': {
          currentAssistantMessageRef.current = null;
          setIsLoading(false);
          break;
        }

        case 'error': {
          setError(event.content || 'An error occurred');
          setIsLoading(false);

          // If there's a current assistant message, add error to it
          if (currentAssistantMessageRef.current) {
            const currentMsg = currentAssistantMessageRef.current;
            currentMsg.content.push({
              type: 'text',
              content: `\n\nError: ${event.content}`,
            });
            setMessages(prev =>
              prev.map(m => m.id === currentMsg.id ? { ...currentMsg } : m)
            );
          }
          break;
        }
      }
    };

    const handleChatExit = (code: number) => {
      setStatus('disconnected');
      setIsLoading(false);
      currentAssistantMessageRef.current = null;

      if (code !== 0) {
        setError(`Chat process exited with code ${code}`);
      }
    };

    const cleanup1 = api.onChatResponse(handleChatResponse);
    const cleanup2 = api.onChatExit(handleChatExit);
    return () => {
      cleanup1();
      cleanup2();
    };
  }, [api]);

  const startChat = useCallback(async (projectPath: string) => {
    if (!api) {
      setError('API not initialized');
      return;
    }
    setStatus('connecting');
    setError(null);

    try {
      await api.startChat(projectPath);
      setStatus('connected');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to start chat');
    }
  }, [api]);

  const sendMessage = useCallback(async (message: string) => {
    if (!api || !message.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: [{ type: 'text', content: message }],
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      await api.sendMessage(message);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to send message');
    }
  }, [api]);

  const stopChat = useCallback(async () => {
    if (!api) return;
    try {
      await api.stopChat();
      setStatus('disconnected');
      setIsLoading(false);
      currentAssistantMessageRef.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop chat');
    }
  }, [api]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    currentAssistantMessageRef.current = null;
    setError(null);
  }, []);

  return {
    messages,
    status,
    isLoading,
    error,
    startChat,
    sendMessage,
    stopChat,
    clearMessages,
  };
}
