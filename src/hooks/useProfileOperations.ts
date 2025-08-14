import { useMutation, useQueryClient } from '@tanstack/react-query';
import { edgeRequest, ApiError } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { useToast } from '@/hooks/use-toast';
import { queryKeys, invalidationHelpers } from '@/queries/keys';

export type ProfileUpdatePayload = {
  fullName: string;
  businessName: string;
  phoneRaw: string;
};

export type ProfileUpdateResponse = {
  data: {
    fullName: string;
    businessName: string;
    nameCustomized: boolean;
    phoneE164: string;
  };
};

/**
 * Centralized profile operations hook
 * Handles both user profile and business profile updates with optimistic updates
 */
export function useProfileOperations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateProfile = useMutation({
    mutationFn: async (input: ProfileUpdatePayload) => {
      console.info('[useProfileOperations] mutation started', { 
        url: fn('profile-update'), 
        payload: input,
        hasName: !!input.fullName, 
        hasBusiness: !!input.businessName, 
        hasPhone: !!input.phoneRaw 
      });
      
      try {
        const result = await edgeRequest(fn('profile-update'), {
          method: 'POST',
          body: JSON.stringify(input),
        });
        
        console.info('[useProfileOperations] mutation completed successfully', result);
        return result;
      } catch (error) {
        console.error('[useProfileOperations] mutation failed:', error);
        throw error;
      }
    },
    
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.business.current() });
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.current() });

      // Snapshot previous values
      const previousBusiness = queryClient.getQueryData(queryKeys.business.current());
      const previousProfile = queryClient.getQueryData(queryKeys.profile.current());

      // Optimistically update business
      queryClient.setQueryData(queryKeys.business.current(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          name: variables.businessName,
          nameCustomized: variables.businessName.toLowerCase() !== 'my business'
        };
      });

      // Optimistically update profile
      queryClient.setQueryData(queryKeys.profile.current(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          fullName: variables.fullName,
          phoneE164: variables.phoneRaw // This will be normalized by server
        };
      });

      return { previousBusiness, previousProfile };
    },
    
    onError: (error: ApiError, variables, context) => {
      // Revert optimistic updates
      if (context?.previousBusiness) {
        queryClient.setQueryData(queryKeys.business.current(), context.previousBusiness);
      }
      if (context?.previousProfile) {
        queryClient.setQueryData(queryKeys.profile.current(), context.previousProfile);
      }
      
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
    
    onSuccess: (data: ProfileUpdateResponse) => {
      console.log('Profile update successful:', data);
      
      // Update with server response to ensure consistency
      queryClient.setQueryData(queryKeys.business.current(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          name: data.data.businessName,
          nameCustomized: data.data.nameCustomized
        };
      });

      queryClient.setQueryData(queryKeys.profile.current(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          fullName: data.data.fullName,
          phoneE164: data.data.phoneE164
        };
      });

      // Invalidate related queries to trigger refetch
      invalidationHelpers.all(queryClient);
      
      // Force dashboard data refresh to update onboarding state
      window.dispatchEvent(new CustomEvent('business-updated'));

      toast({
        title: "Profile updated",
        description: "Your profile changes have been saved.",
      });
    },
    
    onSettled: () => {
      // Always refetch to ensure server state is correct
      invalidationHelpers.all(queryClient);
    }
  });

  return {
    updateProfile,
    isUpdating: updateProfile.isPending
  };
}