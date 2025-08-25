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
        body: { id: customerId },
        toast: {
          success: "Customer deleted successfully",
          loading: "Deleting customer...",
          error: "Failed to delete customer"
        }
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

  const bulkDeleteMutation = useMutation({
    mutationFn: async (customerIds: string[]) => {
      const { data, error } = await authApi.invoke('customers-bulk-delete', {
        method: 'POST',
        body: { customerIds },
        toast: {
          success: `Successfully deleted ${customerIds.length} customer${customerIds.length === 1 ? '' : 's'}`,
          loading: `Deleting ${customerIds.length} customer${customerIds.length === 1 ? '' : 's'}...`,
          error: "Failed to delete customers"
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to delete customers');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.customers(businessId || '') });
    },
    onError: (error: any) => {
      console.error('[useCustomerOperations] bulk delete error:', error);
    }
  });

  return {
    deleteCustomer: deleteMutation,
    isDeletingCustomer: deleteMutation.isPending,
    deleteError: deleteMutation.error,
    bulkDeleteCustomers: bulkDeleteMutation,
    isBulkDeleting: bulkDeleteMutation.isPending,
    bulkDeleteError: bulkDeleteMutation.error
  };
}