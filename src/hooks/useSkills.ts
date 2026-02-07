import { useQuery } from '@tanstack/react-query';
import { useApi } from './useApi';

export function useSkills() {
  const api = useApi();

  const query = useQuery({
    queryKey: ['skills'],
    queryFn: () => api!.getSkills(),
    enabled: api !== null,
  });

  return {
    skills: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
