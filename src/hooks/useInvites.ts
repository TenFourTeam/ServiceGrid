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
    mutationFn: async ({ token }: { token: string }) => {
      const { data, error } = await authApi.invoke("invite-redeem", {
        method: "POST",
        body: { token },
        toast: {
          success: "Invite redeemed successfully",
          loading: "Redeeming invitation...",
          error: "Failed to redeem invite"
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to redeem invite');
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Invalidate team queries to refresh member list
      if (data?.businessId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.data.members(data.businessId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.team.invites(data.businessId) });
      }
      // Toast is handled by authApi
    },
    onError: (error: Error | unknown) => {
      console.error('[useRedeemInvite] error:', error);
    },
  });
}