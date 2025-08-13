import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeFetchJson } from "@/utils/edgeApi";

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
  const enabled = !!isSignedIn && !!businessId;

  return useQuery<{ invites: Invite[] }, Error>({
    queryKey: ["pending-invites", businessId],
    enabled,
    queryFn: async () => {
      if (!businessId) return { invites: [] };
      const data = await edgeFetchJson(`invite-manage?action=list&business_id=${businessId}`, getToken);
      return data || { invites: [] };
    },
    staleTime: 30_000,
  });
}

export function useRevokeInvite() {
  const { getToken } = useClerkAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      return await edgeFetchJson("invite-manage", getToken, {
        method: "POST",
        body: { inviteId, action: "revoke" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
    },
  });
}

export function useResendInvite() {
  const { getToken } = useClerkAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      return await edgeFetchJson("invite-manage", getToken, {
        method: "POST",
        body: { inviteId, action: "resend" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending-invites"] });
    },
  });
}

export function useRedeemInvite() {
  const { getToken } = useClerkAuth();

  return useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      return await edgeFetchJson("invite-redeem", getToken, {
        method: "POST",
        body: { token },
      });
    },
  });
}