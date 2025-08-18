import { useAuth } from '@clerk/clerk-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { invalidationHelpers } from '@/queries/keys';

export function useBusinessSwitcher() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));

  const switchBusiness = useMutation({
    mutationFn: async (businessId: string) => {
      console.log('[useBusinessSwitcher] Switching to business:', businessId);
      
      const { data, error } = await authApi.invoke('update-profile', {
        method: 'POST',
        body: { default_business_id: businessId },
        toast: {
          loading: 'Switching business...',
          success: 'Business switched successfully',
          error: 'Failed to switch business'
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to switch business');
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate all business-related queries
      invalidationHelpers.profile(queryClient);
      invalidationHelpers.business(queryClient);
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
      
      // Force a page refresh to ensure all components update with new business context
      window.location.reload();
    },
    onError: (error: any) => {
      console.error('[useBusinessSwitcher] Switch failed:', error);
    },
  });

  return {
    switchBusiness,
    isSwitching: switchBusiness.isPending
  };
}