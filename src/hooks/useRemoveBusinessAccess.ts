import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';

interface RemoveBusinessAccessParams {
  businessId: string;
}

export function useRemoveBusinessAccess() {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();

  return useMutation({
    mutationFn: async ({ businessId }: RemoveBusinessAccessParams) => {
      const { data, error } = await authApi.invoke('remove-business-access', {
        method: 'POST',
        body: { businessId }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to remove business access');
      }
      
      return data;
    },
    onMutate: async ({ businessId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['user-businesses'] });
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['user-businesses']);
      
      // Optimistically remove the business from cache
      queryClient.setQueryData(['user-businesses'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter(business => business.id !== businessId);
      });
      
      return { previousData };
    },
    onError: (error, variables, context) => {
      // Rollback optimistic update
      if (context?.previousData) {
        queryClient.setQueryData(['user-businesses'], context.previousData);
      }
      
      toast.error(error.message || "Failed to leave business");
    },
    onSuccess: () => {
      toast.success("You have left the business");
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-pending-invites'] });
    },
  });
}