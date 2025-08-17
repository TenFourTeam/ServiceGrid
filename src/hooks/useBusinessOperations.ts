import { queryKeys, invalidationHelpers } from '@/queries/keys';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';

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
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));

  const updateBusiness = useMutation({
    mutationFn: async (input: BusinessUpdatePayload) => {
      console.info('[useBusinessOperations] mutation started', { 
        payload: input,
        hasName: !!input.businessName, 
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
        throw new Error(error.message || 'Failed to update business');
      }
      
      console.info('[useBusinessOperations] mutation completed successfully', data);
      return data;
    },
    onSuccess: () => {
      // Use centralized invalidation for business data
      invalidationHelpers.business(queryClient);
      
      // Force dashboard data refresh to update onboarding state
      window.dispatchEvent(new CustomEvent('business-updated'));
    },
    onError: (error: any) => {
      console.error('[useBusinessOperations] mutation error:', error);
    },
  });

  return {
    updateBusiness,
    isUpdating: updateBusiness.isPending
  };
}