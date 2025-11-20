import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { queryKeys } from '@/queries/keys';
import type { QBConnectionStatus } from '@/types/quickbooks';

export function useQuickBooksConnection() {
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const statusQuery = useQuery<QBConnectionStatus>({
    queryKey: queryKeys.integrations.quickbooks(businessId || ''),
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('quickbooks-connection-status', {
        method: 'GET'
      });

      if (error) throw new Error(error.message);
      return data as QBConnectionStatus;
    },
  });

  const connect = useMutation({
    mutationFn: async () => {
      const { data, error } = await authApi.invoke('quickbooks-oauth', {
        method: 'GET',
        queryParams: { action: 'connect' }
      });

      if (error) throw new Error(error.message);
      
      // Open OAuth window
      if (data.url) {
        window.open(data.url, '_blank', 'width=600,height=700');
      }

      return data;
    },
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const { data, error } = await authApi.invoke('quickbooks-oauth', {
        method: 'GET',
        queryParams: { action: 'disconnect' }
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.integrations.quickbooks(businessId || '') 
      });
    },
  });

  return {
    status: statusQuery.data,
    isLoading: statusQuery.isLoading,
    isConnected: statusQuery.data?.isConnected ?? false,
    connect,
    disconnect,
  };
}
