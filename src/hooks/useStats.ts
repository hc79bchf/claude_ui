import { useQuery } from '@tanstack/react-query';
import { electronAPI } from '../lib/electron';

export type StatsPeriod = 'today' | 'week' | 'month' | 'all';

export function useStats(period: StatsPeriod) {
  return useQuery({
    queryKey: ['stats', period],
    queryFn: () => electronAPI.getStats(period),
    // Refetch every 5 minutes since stats don't change frequently
    staleTime: 5 * 60 * 1000,
  });
}
