import { useMutation, useQueryClient } from '@tanstack/react-query';
import { edgeRequest, ApiError } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { useToast } from '@/hooks/use-toast';
import { queryKeys, invalidationHelpers } from '@/queries/keys';

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
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.current() });

      // Snapshot previous values
      const previousProfile = queryClient.getQueryData(queryKeys.profile.current());

      // Optimistically update profile with all fields including business name
      queryClient.setQueryData(queryKeys.profile.current(), (old: any) => {
        if (!old) return old;
        const businessName = variables.businessName || 'My Business';
        return {
          ...old,
          fullName: variables.fullName,
          phoneE164: variables.phoneRaw, // This will be normalized by server
          businessName: businessName,
          businessNameCustomized: businessName.trim().toLowerCase() !== 'my business'
        };
      });

      return { 
        previousProfile,
        profileKey: queryKeys.profile.current()
      };
    },
    
    onError: (error: ApiError, variables, context) => {
      // Revert optimistic updates
      if (context?.previousProfile && context?.profileKey) {
        queryClient.setQueryData(context.profileKey, context.previousProfile);
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
    
    onSuccess: (data: ProfileUpdateResponse, variables, context) => {
      console.log('Profile update successful:', data);
      
      // Authoritative cache write with server response - only update profile cache
      if (context?.profileKey) {
        queryClient.setQueryData(context.profileKey, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            fullName: data.data.fullName,
            phoneE164: data.data.phoneE164,
            businessName: data.data.businessName,
            businessNameCustomized: data.data.businessNameCustomized
          };
        });
      }

      // Force dashboard data refresh to update onboarding state
      window.dispatchEvent(new CustomEvent('business-updated'));

      toast({
        title: "Profile updated",
        description: "Your profile changes have been saved.",
      });
    },
    
    onSettled: (data, error, variables, context) => {
      // Single targeted invalidation to reconcile across tabs/background
      if (context?.profileKey) {
        queryClient.invalidateQueries({ queryKey: context.profileKey, exact: true });
      }
    }
  });

  return {
    updateProfile,
    isUpdating: updateProfile.isPending
  };
}