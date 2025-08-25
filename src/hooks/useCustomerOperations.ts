import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { queryKeys } from '@/queries/keys';
import { toast } from 'sonner';
import type { Customer } from '@/types';

export function useCustomerOperations() {
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => {
      console.info('[useCustomerOperations] Starting deletion for customer:', customerId);
      
      const { data, error } = await authApi.invoke('customers-crud', {
        method: 'DELETE',
        body: { id: customerId }
      });
      
      if (error) {
        console.error('[useCustomerOperations] Delete failed:', error);
        throw new Error(error.message || 'Failed to delete customer');
      }
      
      console.info('[useCustomerOperations] Customer deleted successfully');
      return data;
    },
    onMutate: async (customerId) => {
      if (!businessId) return;
      
      console.info('[useCustomerOperations] Optimistic update - removing customer from cache');
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.data.customers(businessId) });
      
      // Snapshot the previous value
      const previousCustomers = queryClient.getQueryData(queryKeys.data.customers(businessId));
      
      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.data.customers(businessId), (old: any) => {
        if (!old?.customers) return old;
        return {
          ...old,
          customers: old.customers.filter((c: Customer) => c.id !== customerId),
          count: (old.count || 0) - 1
        };
      });
      
      return { previousCustomers };
    },
    onSuccess: () => {
      console.info('[useCustomerOperations] Delete mutation succeeded');
      toast.success('Customer deleted successfully');
      
      // Invalidate related queries after successful deletion
      if (businessId) {
        console.info('[useCustomerOperations] Invalidating customer queries');
        queryClient.invalidateQueries({ queryKey: queryKeys.data.customers(businessId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.counts.customers(businessId) });
        // Only invalidate dashboard summary, not all cross-entity queries
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
      }
    },
    onError: (error: any, customerId, context) => {
      console.error('[useCustomerOperations] Delete mutation failed:', error);
      toast.error(error?.message || 'Failed to delete customer');
      
      // Rollback optimistic update
      if (context?.previousCustomers && businessId) {
        console.info('[useCustomerOperations] Rolling back optimistic update');
        queryClient.setQueryData(queryKeys.data.customers(businessId), context.previousCustomers);
      }
    },
    onSettled: () => {
      console.info('[useCustomerOperations] Delete mutation settled');
    }
  });

  return {
    deleteCustomer: deleteMutation.mutate,
    isDeletingCustomer: deleteMutation.isPending,
    deleteError: deleteMutation.error
  };
}