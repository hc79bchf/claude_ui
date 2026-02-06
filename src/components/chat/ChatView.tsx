import { useEffect, useRef, useState } from 'react';
import { useChat, ConnectionStatus } from '../../hooks/useChat';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

function ConnectionStatusIndicator({ status }: { status: ConnectionStatus }) {
  const statusConfig = {
    disconnected: {
      color: 'bg-gray-500',
      text: 'Disconnected',
    },
    connecting: {
      color: 'bg-yellow-500 animate-pulse',
      text: 'Connecting...',
    },
    connected: {
      color: 'bg-green-500',
      text: 'Connected',
    },
    error: {
      color: 'bg-red-500',
      text: 'Error',
    },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="text-gray-400">{config.text}</span>
    </div>
  );
}

interface ProjectSelectorProps {
  onSelect: (path: string) => void;
  disabled?: boolean;
}

function ProjectSelector({ onSelect, disabled }: ProjectSelectorProps) {
  const [projectPath, setProjectPath] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectPath.trim()) {
      onSelect(projectPath.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        value={projectPath}
        onChange={(e) => setProjectPath(e.target.value)}
        placeholder="Enter project path (e.g., /Users/me/myproject)"
        disabled={disabled}
        className={`
          flex-1 px-4 py-2 rounded-lg
          bg-gray-700 border border-gray-600
          text-gray-100 placeholder-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      />
      <button
        type="submit"
        disabled={disabled || !projectPath.trim()}
        className={`
          px-4 py-2 rounded-lg
          bg-blue-600 text-white
          hover:bg-blue-500
          focus:outline-none focus:ring-2 focus:ring-blue-500
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors
        `}
      >
        Connect
      </button>
    </form>
  );
}

export function ChatView() {
  const {
    messages,
    status,
    isLoading,
    error,
    startChat,
    sendMessage,
    stopChat,
    clearMessages,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleStartChat = async (projectPath: string) => {
    await startChat(projectPath);
  };

  const handleStopChat = async () => {
    await stopChat();
  };

  const isConnected = status === 'connected';
  const isConnecting = status === 'connecting';

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-white">Chat with Claude</h1>
          <ConnectionStatusIndicator status={status} />
        </div>

        <div className="flex items-center gap-2">
          {isConnected && (
            <>
              <button
                onClick={clearMessages}
                className="px-3 py-1.5 text-sm rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleStopChat}
                className="px-3 py-1.5 text-sm rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors"
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!isConnected && !isConnecting ? (
          /* Connection UI */
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-xl space-y-4">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">
                  <svg
                    className="w-16 h-16 mx-auto text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-gray-200">
                  Start a new chat session
                </h2>
                <p className="text-gray-400 mt-2">
                  Enter a project path to connect Claude to your codebase
                </p>
              </div>

              <ProjectSelector onSelect={handleStartChat} disabled={false} />

              {error && (
                <div className="p-3 rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : isConnecting ? (
          /* Connecting state */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full mx-auto mb-4" />
              <p className="text-gray-400">Connecting to Claude...</p>
            </div>
          </div>
        ) : (
          /* Chat messages */
          <>
            <div
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto p-4"
            >
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <p>No messages yet</p>
                    <p className="text-sm mt-1">
                      Send a message to start chatting
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                </div>
              )}

              {/* Error display */}
              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-900/50 border border-red-700 text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat input */}
            <ChatInput
              onSend={sendMessage}
              disabled={isLoading}
              placeholder={
                isLoading ? 'Waiting for response...' : 'Type a message...'
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
