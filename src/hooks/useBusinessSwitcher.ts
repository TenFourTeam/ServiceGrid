import { useAuth } from '@clerk/clerk-react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { invalidationHelpers } from '@/queries/keys';
import { toast } from 'sonner';
import { useCurrentBusiness } from '@/contexts/CurrentBusinessContext';

export function useBusinessSwitcher() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const { setCurrentBusinessId } = useCurrentBusiness();

  const switchBusiness = useMutation({
    mutationFn: async (businessId: string) => {
      console.log('[useBusinessSwitcher] Switching to business:', businessId);
      
      // Just update the current business context - no backend call needed
      setCurrentBusinessId(businessId);
      
      return { success: true };
    },
    onSuccess: (data, businessId) => {
      // Invalidate profile queries to refetch with new business context
      queryClient.invalidateQueries({ queryKey: ['profile'] });
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