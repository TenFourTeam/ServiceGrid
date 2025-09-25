import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

export interface UserPendingInvite {
  id: string;
  business_id: string;
  role: 'owner' | 'worker';
  email: string;
  expires_at: string;
  created_at: string;
  invited_by: string;
  token_hash: string;
  businesses: {
    id: string;
    name: string;
    logo_url?: string;
  };
  invited_by_profile: {
    full_name?: string;
    email: string;
  };
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
      
      return data?.invites || [];
    },
    staleTime: 30_000,
  });
}

/**
 * Hook to decline an invite
 */
export function useDeclineInvite() {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();

  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { data, error } = await authApi.invoke('decline-invite', {
        method: 'POST',
        body: { inviteId }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to decline invite');
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