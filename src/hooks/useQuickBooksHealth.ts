import { useQuery } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import type { HealthMetrics } from '@/types/quickbooks';

export function useQuickBooksHealth() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();

  const { data: health, isLoading, refetch } = useQuery<HealthMetrics>({
    queryKey: ['quickbooks', 'health', businessId],
    enabled: !!businessId,
    refetchInterval: 30000, // Refresh every 30 seconds
    queryFn: async () => {
      const { data, error } = await authApi.invoke('quickbooks-health-check', {
        method: 'GET'
      });

      if (error) throw new Error(error.message);
      return data as HealthMetrics;
    },
  });

  return {
    health,
    isLoading,
    refetch,
    isHealthy: health?.connection_status === 'healthy',
    hasWarnings: health?.connection_status === 'warning',
    hasErrors: health?.connection_status === 'error',
  };
}
