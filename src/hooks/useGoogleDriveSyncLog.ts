import { useQuery } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import type { GoogleDriveSyncLog } from '@/types/googleDrive';

export function useGoogleDriveSyncLog() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();

  return useQuery<GoogleDriveSyncLog[]>({
    queryKey: ['google-drive', 'sync-logs', businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('sync-logs-crud', {
        method: 'GET',
        queryParams: { source: 'google-drive' },
      });

      if (error) throw new Error(error.message || 'Failed to fetch sync logs');
      return (data || []) as GoogleDriveSyncLog[];
    },
  });
}
