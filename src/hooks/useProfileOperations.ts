import { invalidationHelpers } from '@/queries/keys';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';

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
 * Profile operations hook using server-side edge function with proper Clerk authentication
 */
export function useProfileOperations() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));

  const updateProfile = useMutation({
    mutationFn: async (input: ProfileUpdatePayload): Promise<ProfileUpdateResponse> => {
      console.info('[useProfileOperations] mutation started', { 
        payload: input,
        hasName: !!input.fullName, 
        hasBusiness: !!input.businessName, 
        hasPhone: !!input.phoneRaw 
      });
      
      // Call the edge function instead of direct Supabase access
      const { data, error } = await authApi.invoke('update-profile', {
        body: {
          fullName: input.fullName,
          phoneRaw: input.phoneRaw,
          businessName: input.businessName
        }
      });
      
      if (error) {
        console.error('[useProfileOperations] edge function error:', error);
        throw new Error(error.message || 'Failed to update profile');
      }
      
      console.info('[useProfileOperations] mutation completed successfully', data);
      return data as ProfileUpdateResponse;
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