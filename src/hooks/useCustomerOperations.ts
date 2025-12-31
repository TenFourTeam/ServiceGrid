import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { queryKeys } from '@/queries/keys';
import { feedback } from '@/utils/feedback';


export function useCustomerOperations() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId, userId } = useBusinessContext();

  // Optimistic create mutation
  const createMutation = useMutation({
    mutationFn: async (customerData: {
      name: string;
      email: string;
      phone?: string | null;
      address?: string | null;
      lead_source?: string | null;
    }) => {
      feedback.optimisticStart();
      
      const { data, error } = await authApi.invoke('customers-crud', {
        method: 'POST',
        body: customerData,
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to create customer');
      }
      
      return data;
    },
    onMutate: async (newCustomer) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.data.customers(businessId || '') });
      
      // Snapshot previous value
      const previousCustomers = queryClient.getQueryData(queryKeys.data.customers(businessId || ''));
      
      // Optimistically add to list with temp ID
      const optimisticCustomer = {
        id: `temp-${Date.now()}`,
        ...newCustomer,
        business_id: businessId,
        owner_id: userId,
        lead_score: 30, // Default pending score
        is_qualified: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        _optimistic: true,
      };
      
      queryClient.setQueryData(queryKeys.data.customers(businessId || ''), (old: any) => {
        if (!old) return [optimisticCustomer];
        return [optimisticCustomer, ...old];
      });
      
      return { previousCustomers };
    },
    onSuccess: (data) => {
      feedback.itemCreated();
      queryClient.invalidateQueries({ queryKey: queryKeys.data.customers(businessId || '') });
    },
    onError: (err, newCustomer, context) => {
      // Rollback on error
      if (context?.previousCustomers) {
        queryClient.setQueryData(queryKeys.data.customers(businessId || ''), context.previousCustomers);
      }
      feedback.error();
    },
  });

  // Optimistic update mutation
  const updateMutation = useMutation({
    mutationFn: async (customerData: { id: string; [key: string]: any }) => {
      feedback.optimisticStart();
      
      const { data, error } = await authApi.invoke('customers-crud', {
        method: 'PUT',
        body: customerData,
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to update customer');
      }
      
      return data;
    },
    onMutate: async (updatedCustomer) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.data.customers(businessId || '') });
      
      const previousCustomers = queryClient.getQueryData(queryKeys.data.customers(businessId || ''));
      
      queryClient.setQueryData(queryKeys.data.customers(businessId || ''), (old: any) => {
        if (!old) return old;
        return old.map((c: any) => 
          c.id === updatedCustomer.id 
            ? { ...c, ...updatedCustomer, _optimistic: true }
            : c
        );
      });
      
      return { previousCustomers };
    },
    onSuccess: () => {
      feedback.optimisticConfirm();
      queryClient.invalidateQueries({ queryKey: queryKeys.data.customers(businessId || '') });
    },
    onError: (err, updatedCustomer, context) => {
      if (context?.previousCustomers) {
        queryClient.setQueryData(queryKeys.data.customers(businessId || ''), context.previousCustomers);
      }
      feedback.error();
    },
  });

  // Optimistic delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (customerId: string) => {
      feedback.optimisticStart();
      
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
    onMutate: async (customerId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.data.customers(businessId || '') });
      
      const previousCustomers = queryClient.getQueryData(queryKeys.data.customers(businessId || ''));
      
      // Optimistically remove from list
      queryClient.setQueryData(queryKeys.data.customers(businessId || ''), (old: any) => {
        if (!old) return old;
        return old.filter((c: any) => c.id !== customerId);
      });
      
      return { previousCustomers };
    },
    onSuccess: () => {
      feedback.optimisticConfirm();
      queryClient.invalidateQueries({ queryKey: queryKeys.data.customers(businessId || '') });
    },
    onError: (error: Error | unknown, customerId, context) => {
      if (context?.previousCustomers) {
        queryClient.setQueryData(queryKeys.data.customers(businessId || ''), context.previousCustomers);
      }
      feedback.error();
      console.error('[useCustomerOperations] error:', error);
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (customerIds: string[]) => {
      feedback.optimisticStart();
      
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
    onMutate: async (customerIds) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.data.customers(businessId || '') });
      
      const previousCustomers = queryClient.getQueryData(queryKeys.data.customers(businessId || ''));
      
      queryClient.setQueryData(queryKeys.data.customers(businessId || ''), (old: any) => {
        if (!old) return old;
        return old.filter((c: any) => !customerIds.includes(c.id));
      });
      
      return { previousCustomers };
    },
    onSuccess: () => {
      feedback.optimisticConfirm();
      queryClient.invalidateQueries({ queryKey: queryKeys.data.customers(businessId || '') });
    },
    onError: (error: Error | unknown, customerIds, context) => {
      if (context?.previousCustomers) {
        queryClient.setQueryData(queryKeys.data.customers(businessId || ''), context.previousCustomers);
      }
      feedback.error();
      console.error('[useCustomerOperations] bulk delete error:', error);
    }
  });

  return {
    // Create
    createCustomer: createMutation,
    isCreatingCustomer: createMutation.isPending,
    createError: createMutation.error,
    // Update
    updateCustomer: updateMutation,
    isUpdatingCustomer: updateMutation.isPending,
    updateError: updateMutation.error,
    // Delete
    deleteCustomer: deleteMutation,
    isDeletingCustomer: deleteMutation.isPending,
    deleteError: deleteMutation.error,
    // Bulk delete
    bulkDeleteCustomers: bulkDeleteMutation,
    isBulkDeleting: bulkDeleteMutation.isPending,
    bulkDeleteError: bulkDeleteMutation.error
  };
}