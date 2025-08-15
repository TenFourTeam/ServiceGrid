import { useStandardMutation } from '@/mutations/useStandardMutation';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { queryKeys, invalidationHelpers } from '@/queries/keys';
import { useQueryClient } from '@tanstack/react-query';

export type BusinessUpdatePayload = {
  businessName: string;
  phone?: string;
  replyToEmail?: string;
};

export type BusinessUpdateResponse = {
  success: boolean;
  business: {
    id: string;
    name: string;
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

  const updateBusiness = useStandardMutation<BusinessUpdateResponse, BusinessUpdatePayload>({
    mutationFn: async (input: BusinessUpdatePayload) => {
      console.info('[useBusinessOperations] mutation started', { 
        url: fn('business-update'), 
        payload: input,
        hasName: !!input.businessName, 
        hasPhone: !!input.phone, 
        hasReplyToEmail: !!input.replyToEmail 
      });
      
      const result = await edgeRequest(fn('business-update'), {
        method: 'POST',
        body: JSON.stringify(input),
      });
      
      console.info('[useBusinessOperations] mutation completed successfully', result);
      return result;
    },
    onSuccess: (data, variables, queryClient) => {
      // Use centralized invalidation for business data
      invalidationHelpers.business(queryClient);
      
      // Force immediate refresh of business queries
      queryClient.invalidateQueries(queryKeys.business.current());
      
      // Force dashboard data refresh to update onboarding state
      window.dispatchEvent(new CustomEvent('business-updated'));
    },
    successMessage: 'Business profile updated successfully',
    errorMessage: 'Failed to save business changes. Please check your connection and try again.',
  });

  return {
    updateBusiness,
    isUpdating: updateBusiness.isPending
  };
}