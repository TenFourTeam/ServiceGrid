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
      console.info('[useProfileUpdate] mutating', { url: fn('profile-update'), hasName: !!input.fullName, hasBusiness: !!input.businessName, hasPhone: !!input.phoneRaw });
      return await edgeRequest(fn('profile-update'), {
        method: 'POST',
        body: JSON.stringify(input),
      });
    },
    onSuccess: (data) => {
      console.log('Profile update successful:', data);
      
      // Re-fetch server truth that drives onboarding progress
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
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