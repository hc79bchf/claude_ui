import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useApi } from './useApi';

export function useSessions() {
  const queryClient = useQueryClient();
  const api = useApi();

  const query = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api!.getSessions(),
    enabled: api !== null,
  });

  useEffect(() => {
    if (!api) return;
    const cleanup = api.onSessionUpdate((updatedSession) => {
      queryClient.setQueryData(['sessions'], (old: unknown[] | undefined) => {
        if (!old) return [updatedSession];
        const index = old.findIndex((s: any) => s.id === updatedSession.id);
        if (index >= 0) {
          const newSessions = [...old];
          newSessions[index] = updatedSession;
          return newSessions;
        }
        return [updatedSession, ...old];
      });
    });

    return cleanup;
  }, [queryClient, api]);

  return query;
}
