import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuthApi } from '@/hooks/useAuthApi';
import { invalidationHelpers } from '@/queries/keys';
import { toast } from 'sonner';
import { useCurrentBusiness } from '@/contexts/CurrentBusinessContext';

export function useBusinessSwitcher() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const authApi = useAuthApi();
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