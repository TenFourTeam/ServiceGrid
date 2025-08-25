import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { queryKeys } from '@/queries/keys';


export function useCustomerOperations(dialogCallbacks?: {
  setDeleteDialogOpen: (open: boolean) => void;
  setCustomerToDelete: (customer: any) => void;
}) {
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
      // Close dialog and clear state after successful deletion
      if (dialogCallbacks) {
        dialogCallbacks.setDeleteDialogOpen(false);
        dialogCallbacks.setCustomerToDelete(null);
      }
    },
    onError: (error: any) => {
      console.error('[useCustomerOperations] error:', error);
      // Keep dialog open on error so user can retry or cancel
    }
  });

  return {
    deleteCustomer: deleteMutation.mutate,
    isDeletingCustomer: deleteMutation.isPending,
    deleteError: deleteMutation.error
  };
}