import { useQuery } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import type { QBSyncLog } from '@/types/quickbooks';

export function useQuickBooksSyncLogs() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();

  return useQuery<QBSyncLog[]>({
    queryKey: ['quickbooks', 'sync-logs', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('sync-logs-crud', {
        method: 'GET',
        queryParams: { source: 'quickbooks' },
      });

      if (error) throw new Error(error.message || 'Failed to fetch sync logs');
      return (data || []) as QBSyncLog[];
    },
  });
}
