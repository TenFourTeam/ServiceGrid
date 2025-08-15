import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys, invalidationHelpers } from "@/queries/keys";
import { useStandardMutation } from "@/mutations/useStandardMutation";

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
    queryKey: queryKeys.team.invites(businessId || ''),
    enabled,
    queryFn: async () => {
      if (!businessId) return { invites: [] };
      const data = await edgeRequest(fn(`invite-manage?action=list&business_id=${businessId}`));
      return data || { invites: [] };
    },
    staleTime: 30_000,
  });
}

export function useRevokeInvite(businessId: string) {
  return useStandardMutation<any, { inviteId: string }>({
    mutationFn: async ({ inviteId }) => {
      return await edgeRequest(fn("invite-manage"), {
        method: "POST",
        body: JSON.stringify({ inviteId, action: "revoke" }),
      });
    },
    onSuccess: (_, variables, queryClient) => {
      invalidationHelpers.team(queryClient, businessId);
    },
    successMessage: "Invite revoked successfully",
    errorMessage: "Failed to revoke invite",
  });
}

export function useResendInvite(businessId: string) {
  return useStandardMutation<any, { inviteId: string }>({
    mutationFn: async ({ inviteId }) => {
      return await edgeRequest(fn("invite-manage"), {
        method: "POST",
        body: JSON.stringify({ inviteId, action: "resend" }),
      });
    },
    onSuccess: (_, variables, queryClient) => {
      invalidationHelpers.team(queryClient, businessId);
    },
    successMessage: "Invite resent successfully",
    errorMessage: "Failed to resend invite",
  });
}

export function useRedeemInvite() {
  return useStandardMutation<any, { token: string }>({
    mutationFn: async ({ token }) => {
      return await edgeRequest(fn("invite-redeem"), {
        method: "POST",
        body: JSON.stringify({ token }),
      });
    },
    successMessage: "Invite redeemed successfully",
    errorMessage: "Failed to redeem invite",
  });
}