import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { electronAPI } from '../lib/electron';

export function useSessions() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['sessions'],
    queryFn: () => electronAPI.getSessions(),
  });

  useEffect(() => {
    electronAPI.onSessionUpdate((updatedSession) => {
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
  }, [queryClient]);

  return query;
}
