import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

export interface UserPendingInvite {
  id: string;
  business: {
    id: string;
    name: string;
    owner_id: string;
    logo_url?: string;
  };
  invited_by: {
    id?: string;
    name?: string;
    email: string;
  };
  role: 'owner' | 'worker';
  expires_at: string;
  created_at: string;
}

/**
 * Hook to fetch pending invites for the current user
 */
export function useUserPendingInvites() {
  const authApi = useAuthApi();

  return useQuery<UserPendingInvite[], Error>({
    queryKey: ['user-pending-invites'],
    queryFn: async () => {
      const { data, error } = await authApi.invoke('user-pending-invites', {
        method: 'GET'
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch pending invites');
      }
      
      return data?.data || [];
    },
    staleTime: 30_000,
  });
}

/**
 * Hook to manage invites (accept or decline)
 */
export function useManageInvite() {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();

  return useMutation({
    mutationFn: async ({ action, invite }: { action: 'accept' | 'decline', invite: UserPendingInvite }) => {
      // Use manage-invite for both accept and decline actions
      const { data, error } = await authApi.invoke('manage-invite', {
        method: 'POST',
        body: { action, inviteId: invite.id }
      });
      
      if (error) {
        throw new Error(error.message || `Failed to ${action} invite`);
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate pending invites to refresh the list
      queryClient.invalidateQueries({ queryKey: ['user-pending-invites'] });
      // Also invalidate user businesses in case they joined a new business
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
    },
  });
}