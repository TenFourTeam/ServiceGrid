import { useMutation, useQueryClient } from '@tanstack/react-query';
import { edgeRequest, ApiError } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { useToast } from '@/hooks/use-toast';

export type ProfileUpdatePayload = {
  fullName: string;
  businessName: string;
  phoneRaw: string;
};

export function useProfileUpdate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: ProfileUpdatePayload) => {
      console.info('[useProfileUpdate] mutation started', { 
        url: fn('profile-update'), 
        payload: input,
        hasName: !!input.fullName, 
        hasBusiness: !!input.businessName, 
        hasPhone: !!input.phoneRaw 
      });
      
      const result = await edgeRequest(fn('profile-update'), {
        method: 'POST',
        body: JSON.stringify(input),
      });
      
      console.info('[useProfileUpdate] mutation completed successfully', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('Profile update successful:', data);
      
      // Align with unified onboarding query keys
      queryClient.invalidateQueries({ queryKey: ['profile.current'] });
      queryClient.invalidateQueries({ queryKey: ['business.current'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard.summary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] }); // legacy compatibility
      
      // Force dashboard data refresh to update onboarding state
      window.dispatchEvent(new CustomEvent('business-updated'));

      toast({
        title: "Profile updated",
        description: "Your profile changes have been saved.",
      });
    },
    onError: (error: ApiError) => {
      console.error('Profile update failed:', { 
        status: error.status, 
        code: error.code, 
        message: error.message,
        details: error.details 
      });

      toast({
        title: "Save failed",
        description: error.message || "Failed to save your changes. Please check your connection and try again.",
        variant: "destructive",
      });
    },
  });
}