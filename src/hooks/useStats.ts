import { useQuery } from '@tanstack/react-query';
import { useApi } from './useApi';

export type StatsPeriod = 'today' | 'week' | 'month' | 'all';

export function useStats(period: StatsPeriod) {
  const api = useApi();

  return useQuery({
    queryKey: ['stats', period],
    queryFn: () => api!.getStats(period),
    enabled: api !== null,
    // Refetch every 5 minutes since stats don't change frequently
    staleTime: 5 * 60 * 1000,
  });
}
