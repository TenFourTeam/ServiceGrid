import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthApi } from "@/hooks/useAuthApi";
import { queryKeys, invalidationHelpers } from "@/queries/keys";

export interface Invite {
  id: string;
  email: string;
  role: 'worker' | 'owner';
  expires_at: string;
  created_at: string;
  invited_by: string;
  profiles?: {
    email: string;
  };
}

// Note: Invite-worker functionality removed - all team additions now go through user selection

export function useRedeemInvite() {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();

  return useMutation({
    mutationFn: async (token_hash: string) => {
      const { data, error } = await authApi.invoke('accept-invite', {
        method: 'POST',
        body: { token_hash }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to accept invite');
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Invalidate member queries for the business that was joined
      if (data.business_id) {
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.team.members(data.business_id) 
        });
        queryClient.invalidateQueries({ 
          queryKey: queryKeys.team.invites(data.business_id) 
        });
      }
      // Invalidate user businesses query to refresh external memberships
      queryClient.invalidateQueries({ 
        queryKey: ['user-businesses'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['external-memberships'] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['primary-business'] 
      });
    },
  });
}