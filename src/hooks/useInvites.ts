import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { queryKeys, invalidationHelpers } from "@/queries/keys";
import { createAuthEdgeApi } from "@/utils/authEdgeApi";

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
  const { isSignedIn, getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const enabled = !!isSignedIn && !!businessId;

  return useQuery<{ invites: Invite[] }, Error>({
    queryKey: queryKeys.team.invites(businessId || ''),
    enabled,
    queryFn: async () => {
      if (!businessId) return { invites: [] };
      
      const { data, error } = await authApi.invoke('invite-manage', {
        method: 'GET',
        body: { action: 'list', business_id: businessId }
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
  const { getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  
  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      const { data, error } = await authApi.invoke("invite-manage", {
        method: "POST",
        body: { inviteId, action: "revoke" },
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
    onError: (error: any) => {
      console.error('[useRevokeInvite] error:', error);
    },
  });
}

export function useResendInvite(businessId: string) {
  const queryClient = useQueryClient();
  const { getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  
  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      const { data, error } = await authApi.invoke("invite-manage", {
        method: "POST",
        body: { inviteId, action: "resend" },
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
    onError: (error: any) => {
      console.error('[useResendInvite] error:', error);
    },
  });
}

export function useRedeemInvite() {
  const { getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  
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
    onSuccess: () => {
      // Toast is handled by authApi
    },
    onError: (error: any) => {
      console.error('[useRedeemInvite] error:', error);
    },
  });
}