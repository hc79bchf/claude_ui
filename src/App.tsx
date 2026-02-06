import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { View } from './components/layout/NavRail';
import { SessionsView } from './components/sessions/SessionsView';
import { ChatView } from './components/chat/ChatView';

const queryClient = new QueryClient();

function MainContent({ view }: { view: View }) {
  switch (view) {
    case 'sessions':
      return <SessionsView />;
    case 'chat':
      return <ChatView />;
    case 'tools':
      return <PlaceholderView name="Tools" />;
    case 'skills':
      return <PlaceholderView name="Skills" />;
    case 'stats':
      return <PlaceholderView name="Stats" />;
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
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        {(view) => <MainContent view={view} />}
      </Layout>
    </QueryClientProvider>
  );
}
