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
    businessName?: string;
    phoneE164: string;
    nameCustomized?: boolean;
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
      await queryClient.cancelQueries({ queryKey: queryKeys.business.current() });
      await queryClient.cancelQueries({ queryKey: queryKeys.profile.current() });

      // Snapshot previous values
      const previousBusiness = queryClient.getQueryData(queryKeys.business.current());
      const previousProfile = queryClient.getQueryData(queryKeys.profile.current());

      // Optimistically update business with nameCustomized logic
      if (variables.businessName !== undefined) {
        queryClient.setQueryData(queryKeys.business.current(), (old: any) => {
          if (!old) return old;
          const newName = variables.businessName || 'My Business';
          return {
            ...old,
            name: newName,
            nameCustomized: newName.trim().toLowerCase() !== 'my business'
          };
        });
      }

      // Optimistically update profile
      queryClient.setQueryData(queryKeys.profile.current(), (old: any) => {
        if (!old) return old;
        return {
          ...old,
          fullName: variables.fullName,
          phoneE164: variables.phoneRaw // This will be normalized by server
        };
      });

      return { 
        previousBusiness, 
        previousProfile,
        businessKey: queryKeys.business.current(),
        profileKey: queryKeys.profile.current()
      };
    },
    
    onError: (error: ApiError, variables, context) => {
      // Revert optimistic updates
      if (context?.previousBusiness && context?.businessKey) {
        queryClient.setQueryData(context.businessKey, context.previousBusiness);
      }
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
      
      // Authoritative cache write with server response
      if (data.data.businessName !== undefined && context?.businessKey) {
        queryClient.setQueryData(context.businessKey, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            name: data.data.businessName,
            nameCustomized: data.data.nameCustomized ?? (data.data.businessName?.trim().toLowerCase() !== 'my business'),
            updatedAt: data.data.updatedAt || old.updatedAt
          };
        });
      }

      if (context?.profileKey) {
        queryClient.setQueryData(context.profileKey, (old: any) => {
          if (!old) return old;
          return {
            ...old,
            fullName: data.data.fullName,
            phoneE164: data.data.phoneE164
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
      if (context?.businessKey) {
        queryClient.invalidateQueries({ queryKey: context.businessKey, exact: true });
      }
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