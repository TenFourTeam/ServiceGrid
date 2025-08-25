import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { queryKeys } from '@/queries/keys';


export function useCustomerOperations() {
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { data, error } = await authApi.invoke('customers-crud', {
        method: 'DELETE',
        body: { id: customerId }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to delete customer');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.customers(businessId || '') });
    },
    onError: (error: any) => {
      console.error('[useCustomerOperations] error:', error);
    }
  });

  return {
    deleteCustomer: deleteMutation,
    isDeletingCustomer: deleteMutation.isPending,
    deleteError: deleteMutation.error
  };
}