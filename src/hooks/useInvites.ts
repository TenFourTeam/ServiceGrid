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

export function usePendingInvites(businessId?: string) {
  const authApi = useAuthApi();
  const enabled = !!businessId;

  return useQuery<{ invites: Invite[] }, Error>({
    queryKey: queryKeys.team.invites(businessId || ''),
    enabled,
    queryFn: async () => {
      if (!businessId) return { invites: [] };
      
      const { data, error } = await authApi.invoke(`invite-worker?business_id=${businessId}`, {
        method: 'GET'
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch pending invites');
      }
      
      return data || { invites: [] };
    },
    staleTime: 30_000,
  });
}

export function useRevokeInvite(businessId: string) {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();
  
  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      const { data, error } = await authApi.invoke(`invite-worker?invite_id=${inviteId}`, {
        method: "DELETE",
        toast: {
          success: "Invite revoked successfully",
          loading: "Revoking invitation...",
          error: "Failed to revoke invite"
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to revoke invite');
      }
      
      return data;
    },
    onSuccess: () => {
      invalidationHelpers.team(queryClient, businessId);
    },
    onError: (error: Error | unknown) => {
      console.error('[useRevokeInvite] error:', error);
    },
  });
}

export function useResendInvite(businessId: string) {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();
  
  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      const { data, error } = await authApi.invoke("invite-worker", {
        method: "PUT",
        body: { inviteId },
        toast: {
          success: "Invite resent successfully",
          loading: "Resending invitation...",
          error: "Failed to resend invite"
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to resend invite');
      }
      
      return data;
    },
    onSuccess: () => {
      invalidationHelpers.team(queryClient, businessId);
    },
    onError: (error: Error | unknown) => {
      console.error('[useResendInvite] error:', error);
    },
  });
}

export function useRedeemInvite() {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();

  return useMutation({
    mutationFn: async (token_hash: string) => {
      const { data, error } = await authApi.invoke('manage-invite', {
        method: 'POST',
        body: { action: 'accept', token_hash }
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
      // Invalidate user businesses query
      queryClient.invalidateQueries({ 
        queryKey: ['user-businesses'] 
      });
    },
  });
}