import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthApi } from "@/hooks/useAuthApi";
import { queryKeys, invalidationHelpers } from "@/queries/keys";
import { getErrorMessage, hasProperty } from "@/utils/apiHelpers";

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
        const errorMessage = (error && typeof error === 'object' && 'message' in error) 
          ? (error as { message: string }).message 
          : 'Failed to fetch pending invites';
        throw new Error(errorMessage);
      }
      
      return (data && typeof data === 'object' && 'invites' in data) 
        ? data as { invites: Invite[] }
        : { invites: [] };
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
        const errorMessage = (error && typeof error === 'object' && 'message' in error) 
          ? (error as { message: string }).message 
          : 'Failed to revoke invite';
        throw new Error(errorMessage);
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
        const errorMessage = (error && typeof error === 'object' && 'message' in error) 
          ? (error as { message: string }).message 
          : 'Failed to resend invite';
        throw new Error(errorMessage);
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
        const errorMessage = (error && typeof error === 'object' && 'message' in error) 
          ? (error as { message: string }).message 
          : 'Failed to redeem invite';
        throw new Error(errorMessage);
      }
      
      return data;
    },
    onSuccess: (data) => {
      // Invalidate team queries to refresh member list
      const businessId = hasProperty(data, 'businessId') ? (data.businessId as string) : null;
      if (businessId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.data.members(businessId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.team.invites(businessId) });
      }
      // Toast is handled by authApi
    },
    onError: (error: Error | unknown) => {
      console.error('[useRedeemInvite] error:', error);
    },
  });
}