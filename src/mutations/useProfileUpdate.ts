/**
 * Standardized mutation pattern with proper error handling and rollback
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthSnapshot } from '@/auth';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { queryKeys, invalidationHelpers } from '@/queries/keys';
import { useToast } from '@/hooks/use-toast';

interface ProfileUpdatePayload {
  fullName: string;
  businessName?: string;
  phoneRaw: string;
}

export function useProfileUpdate() {
  const { snapshot } = useAuthSnapshot();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (payload: ProfileUpdatePayload) => {
      console.info('[useProfileUpdate] Updating profile...', { payload });
      
      const response = await edgeRequest(fn('profile-update'), {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      console.info('[useProfileUpdate] Profile updated successfully');
      return response;
    },
    
    onSuccess: () => {
      // Invalidate all related queries to ensure fresh data
      invalidationHelpers.profile(queryClient);
      invalidationHelpers.business(queryClient);
      
      toast({
        title: 'Profile updated',
        description: 'Your profile and business information have been saved.',
      });
    },
    
    onError: (error: any) => {
      console.error('[useProfileUpdate] Failed to update profile:', error);
      
      const message = error?.message || 'Failed to update profile';
      toast({
        title: 'Failed to save',
        description: message,
        variant: 'destructive',
      });
    },
    
    // Retry logic: retry once on network errors, never on auth errors
    retry: (failureCount, error: any) => {
      if (error?.status === 401 || error?.message?.includes('401')) {
        return false; // Don't retry auth errors
      }
      return failureCount < 1; // Retry once for other errors
    },
  });
}