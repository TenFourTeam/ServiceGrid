import { queryKeys, invalidationHelpers } from '@/queries/keys';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { getErrorMessage } from '@/utils/apiHelpers';

export type BusinessUpdatePayload = {
  businessName: string;
  description?: string;
  phone?: string;
  replyToEmail?: string;
};

export type BusinessUpdateResponse = {
  success: boolean;
  business: {
    id: string;
    name: string;
    description?: string;
    phone?: string;
    replyToEmail?: string;
    logoUrl?: string;
    lightLogoUrl?: string;
    taxRateDefault?: number;
    updatedAt?: string;
  };
};

/**
 * Centralized business operations hook
 * Handles business profile updates with proper cache invalidation
 */
export function useBusinessOperations() {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();

  const updateBusiness = useMutation({
    mutationFn: async (input: BusinessUpdatePayload) => {
      console.info('[useBusinessOperations] mutation started', { 
        payload: input,
        hasName: !!input.businessName,
        hasDescription: !!input.description,
        hasPhone: !!input.phone, 
        hasReplyToEmail: !!input.replyToEmail 
      });
      
      const { data, error } = await authApi.invoke('business-update', {
        method: 'POST',
        body: input,
        toast: {
          success: 'Business profile updated successfully',
          loading: 'Updating business profile...',
          error: 'Failed to save business changes. Please check your connection and try again.'
        }
      });
      
      if (error) {
        throw new Error(getErrorMessage(error, 'Failed to update business'));
      }
      
      console.info('[useBusinessOperations] mutation completed successfully', data);
      return data;
    },
    onSuccess: () => {
      // Use centralized invalidation for business data
      invalidationHelpers.business(queryClient);
      
      // Also invalidate profile cache since business data is included in profile response
      invalidationHelpers.profile(queryClient);
      
      // Force dashboard data refresh to update onboarding state
      window.dispatchEvent(new CustomEvent('business-updated'));
    },
    onError: (error: Error | unknown) => {
      console.error('[useBusinessOperations] mutation error:', error);
    },
  });

  return {
    updateBusiness,
    isUpdating: updateBusiness.isPending
  };
}