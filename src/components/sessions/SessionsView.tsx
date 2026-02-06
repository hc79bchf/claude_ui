import { useSessions } from '../../hooks/useSessions';
import { SessionCard } from './SessionCard';

export function SessionsView() {
  const { data: sessions, isLoading, error } = useSessions();

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">Loading sessions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-red-400">Error loading sessions</p>
      </div>
    );
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No sessions found</p>
          <p className="text-sm text-gray-500 mt-1">
            Start using Claude Code to see sessions here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Sessions</h1>
      <div className="grid gap-3">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            onClick={() => console.log('Open session:', session.id)}
          />
        ))}
      </div>
    </div>
  );
}
