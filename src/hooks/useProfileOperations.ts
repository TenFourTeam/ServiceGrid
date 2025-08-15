import { useStandardMutation } from '@/mutations/useStandardMutation';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { queryKeys, invalidationHelpers } from '@/queries/keys';
import { useQueryClient } from '@tanstack/react-query';

export type ProfileUpdatePayload = {
  fullName: string;
  businessName?: string;
  phoneRaw: string;
};

export type ProfileUpdateResponse = {
  data: {
    fullName: string;
    businessName: string;
    phoneE164: string;
    businessNameCustomized: boolean;
    updatedAt?: string;
  };
};

/**
 * Centralized profile operations hook
 * Handles both user profile and business profile updates with optimistic updates
 */
export function useProfileOperations() {
  const queryClient = useQueryClient();

  const updateProfile = useStandardMutation<ProfileUpdateResponse, ProfileUpdatePayload>({
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
    onSuccess: (data, variables, queryClient) => {
      // Use centralized invalidation
      invalidationHelpers.profile(queryClient);
      
      // Force dashboard data refresh to update onboarding state
      window.dispatchEvent(new CustomEvent('business-updated'));
    },
    successMessage: 'Profile updated successfully',
    errorMessage: 'Failed to save your changes. Please check your connection and try again.',
  });

  return {
    updateProfile,
    isUpdating: updateProfile.isPending
  };
}