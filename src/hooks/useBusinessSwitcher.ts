import { useAuth } from '@clerk/clerk-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { invalidationHelpers } from '@/queries/keys';
import { toast } from 'sonner';

export function useBusinessSwitcher() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));

  const switchBusiness = useMutation({
    mutationFn: async (businessId: string) => {
      console.log('[useBusinessSwitcher] Switching to business:', businessId);
      
      const { data, error } = await authApi.invoke('switch-business', {
        method: 'POST',
        body: { businessId },
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to switch business');
      }
      
      return data;
    },
    onSuccess: (data, businessId) => {
      // Invalidate all business-related queries
      invalidationHelpers.profile(queryClient);
      invalidationHelpers.business(queryClient);
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
      
      // Show success toast with business info
      toast.success('Business switched successfully', {
        description: 'You are now viewing your selected business'
      });
      
      // Navigate to calendar after switching business
      navigate('/calendar');
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