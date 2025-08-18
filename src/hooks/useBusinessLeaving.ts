import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { invalidationHelpers } from '@/queries/keys';

export interface LeaveBusinessResponse {
  message: string;
}

/**
 * Hook for leaving businesses where user is not an owner
 */
export function useBusinessLeaving() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));

  const leaveBusiness = useMutation({
    mutationFn: async ({ businessId }: { businessId: string }) => {
      console.log(`[useBusinessLeaving] Leaving business: ${businessId}`);
      
      const { data, error } = await authApi.invoke('leave-business', {
        method: 'POST',
        body: { businessId },
        toast: {
          loading: 'Leaving business...',
          success: 'Successfully left business',
          error: 'Failed to leave business'
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to leave business');
      }
      
      return data as LeaveBusinessResponse;
    },
    onSuccess: () => {
      // Invalidate all business-related queries
      invalidationHelpers.profile(queryClient);
      invalidationHelpers.business(queryClient);
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['business-members'] });
      
      // Force a page refresh to ensure all components update
      window.location.reload();
    },
  });

  return {
    leaveBusiness,
    isLeaving: leaveBusiness.isPending,
  };
}