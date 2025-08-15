import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { queryKeys, invalidationHelpers } from '@/queries/keys';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

export type ProfileUpdatePayload = {
  fullName: string;
  businessName?: string; // For reference only, not stored in profiles
  phoneRaw: string;
};

export type ProfileUpdateResponse = {
  data: {
    fullName: string;
    phoneE164: string;
    updatedAt?: string;
  };
};

/**
 * Centralized profile operations hook
 * Handles both user profile and business profile updates with optimistic updates
 */
export function useProfileOperations() {
  const queryClient = useQueryClient();

  const updateProfile = useMutation({
    mutationFn: async (input: ProfileUpdatePayload) => {
      console.info('[useProfileOperations] mutation started', { 
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
      
      console.info('[useProfileOperations] mutation completed successfully', result);
      return result;
    },
    onSuccess: () => {
      // Use centralized invalidation
      invalidationHelpers.profile(queryClient);
      
      // Force dashboard data refresh to update onboarding state
      window.dispatchEvent(new CustomEvent('business-updated'));
      toast.success('Profile updated successfully');
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.message || 'Failed to save your changes. Please check your connection and try again.');
    },
  });

  return {
    updateProfile,
    isUpdating: updateProfile.isPending
  };
}