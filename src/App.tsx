import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Component, ErrorInfo, ReactNode } from 'react';
import { Layout } from './components/layout/Layout';
import { View } from './components/layout/NavRail';
import { SessionsView } from './components/sessions/SessionsView';
import { ChatView } from './components/chat/ChatView';
import { ToolsView } from './components/tools/ToolsView';
import { SkillsView } from './components/skills/SkillsView';
import { StatsView } from './components/stats/StatsView';
import { isElectron } from './lib/electron';

const queryClient = new QueryClient();

// Error boundary to catch React errors
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-red-900 text-white p-8">
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <pre className="bg-black p-4 rounded overflow-auto">
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function MainContent({ view }: { view: View }) {
  switch (view) {
    case 'sessions':
      return <SessionsView />;
    case 'chat':
      return <ChatView />;
    case 'tools':
      return <ToolsView />;
    case 'skills':
      return <SkillsView />;
    case 'stats':
      return <StatsView />;
    default:
      return <PlaceholderView name="Unknown" />;
  }
}

function PlaceholderView({ name }: { name: string }) {
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      <p className="text-lg">{name} View - Coming Soon</p>
    </div>
  );
}

export default function App() {
  console.log('App rendering, isElectron:', isElectron);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <Layout>
          {(view) => <MainContent view={view} />}
        </Layout>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
