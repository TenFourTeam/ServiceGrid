import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import type { QBSyncType, QBSyncDirection } from '@/types/quickbooks';

export function useQuickBooksBulkSync() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const bulkSync = useMutation({
    mutationFn: async ({
      entityIds,
      entityType,
      direction,
      dryRun = false,
    }: {
      entityIds: string[];
      entityType: QBSyncType;
      direction: QBSyncDirection;
      dryRun?: boolean;
    }) => {
      const { data, error } = await authApi.invoke('quickbooks-bulk-sync', {
        method: 'POST',
        body: { entityIds, entityType, direction, dryRun }
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data, variables) => {
      if (!variables.dryRun) {
        queryClient.invalidateQueries({ queryKey: ['quickbooks', 'sync-logs', businessId] });
        queryClient.invalidateQueries({ queryKey: ['data', variables.entityType, businessId] });
        toast.success(`Bulk sync completed`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Bulk sync failed: ${error.message}`);
    },
  });

  return {
    bulkSync: bulkSync.mutate,
    isLoading: bulkSync.isPending,
    progress: bulkSync.data as { completed: number; total: number; errors: string[] } | undefined,
  };
}
