import { useQuery } from '@tanstack/react-query';
import { electronAPI } from '../lib/electron';

export function useSkills() {
  const query = useQuery({
    queryKey: ['skills'],
    queryFn: () => electronAPI.getSkills(),
  });

  return {
    skills: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
