import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { invalidationHelpers } from '@/queries/keys';

export interface CheckUserExistsResponse {
  exists: boolean;
  alreadyMember: boolean;
  user?: {
    id: string;
    email: string;
    name?: string;
    role?: string;
  };
}

export interface AddTeamMemberResponse {
  message: string;
  member: {
    id: string;
    email: string;
    name?: string;
    role: string;
    joined_at: string;
    joined_via_invite: boolean;
  };
}

/**
 * Hook for team management operations
 * Includes checking if users exist and adding existing users directly
 */
export function useTeamOperations() {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();

  const checkUserExists = useMutation({
    mutationFn: async ({ email, businessId }: { email: string; businessId: string }) => {
      console.log(`[useTeamOperations] Checking if user exists: ${email}`);
      
      const { data, error } = await authApi.invoke('check-user-exists', {
        method: 'POST',
        body: { email, businessId },
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to check user existence');
      }
      
      return data as CheckUserExistsResponse;
    },
  });

  const addTeamMember = useMutation({
    mutationFn: async ({ userId, businessId, role = 'worker' }: { 
      userId: string; 
      businessId: string; 
      role?: 'worker' | 'owner';
    }) => {
      console.log(`[useTeamOperations] Adding team member: ${userId}`);
      
      const { data, error } = await authApi.invoke('add-team-member', {
        method: 'POST',
        body: { targetUserId: userId, businessId, role }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to add team member');
      }
      
      return data as AddTeamMemberResponse;
    },
    onSuccess: () => {
      // Invalidate related queries - use generic invalidation
      queryClient.invalidateQueries({ queryKey: ['business-members'] });
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
      // Invalidate profile queries to update role context
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });

  return {
    checkUserExists,
    addTeamMember,
    isCheckingUser: checkUserExists.isPending,
    isAddingMember: addTeamMember.isPending,
  };
}