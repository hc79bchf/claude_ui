import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { electronAPI } from '../lib/electron';
import type { McpServer } from '../types/mcp';

export function useMcpServers() {
  const queryClient = useQueryClient();
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['mcp-servers'],
    queryFn: () => electronAPI.getMcpServers(),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const result = await electronAPI.toggleMcpServer(id, enabled);
      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle server');
      }
      return { id, enabled };
    },
    onMutate: async ({ id, enabled }) => {
      setToggleError(null); // Clear any previous error
      setTogglingId(id);

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['mcp-servers'] });

      // Snapshot the previous value
      const previousServers = queryClient.getQueryData<McpServer[]>(['mcp-servers']);

      // Optimistically update to the new value
      queryClient.setQueryData<McpServer[]>(['mcp-servers'], (old) => {
        if (!old) return old;
        return old.map((server) =>
          server.id === id ? { ...server, enabled } : server
        );
      });

      // Return a context object with the snapshotted value
      return { previousServers };
    },
    onError: (err, _variables, context) => {
      // If the mutation fails, roll back to the previous value
      if (context?.previousServers) {
        queryClient.setQueryData(['mcp-servers'], context.previousServers);
      }
      setToggleError((err as Error).message || 'Failed to toggle server');
      setTogglingId(null);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure sync
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] });
      setTogglingId(null);
    },
  });

  return {
    servers: query.data,
    isLoading: query.isLoading,
    error: query.error,
    toggleServer: toggleMutation.mutate,
    togglingId,
    toggleError,
    clearToggleError: () => setToggleError(null),
  };
}
