import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import type { QBSyncType, QBSyncDirection } from '@/types/quickbooks';

export function useQuickBooksSync() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const syncMutation = useMutation({
    mutationFn: async ({ type, direction }: { type: QBSyncType; direction: QBSyncDirection }) => {
      const functionMap = {
        customer: 'quickbooks-sync-customers',
        invoice: 'quickbooks-sync-invoices',
        payment: 'quickbooks-sync-payments',
        time_entry: 'quickbooks-sync-time',
      };

      const { data, error } = await authApi.invoke(functionMap[type as keyof typeof functionMap], {
        method: 'POST',
        body: { direction }
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: (data, variables) => {
      toast.success(`${variables.type} sync completed`);
      // Invalidate relevant queries
      queryClient.invalidateQueries({ 
        queryKey: ['data', variables.type, businessId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['quickbooks', 'sync-logs', businessId] 
      });
    },
    onError: (error, variables) => {
      toast.error(`${variables.type} sync failed: ${error.message}`);
    },
  });

  return {
    sync: syncMutation.mutate,
    isLoading: syncMutation.isPending,
  };
}
