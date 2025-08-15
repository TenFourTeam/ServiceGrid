import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys, invalidationHelpers } from "@/queries/keys";
import { toast } from "sonner";

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
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      return await edgeRequest(fn("invite-manage"), {
        method: "POST",
        body: JSON.stringify({ inviteId, action: "revoke" }),
      });
    },
    onSuccess: () => {
      invalidationHelpers.team(queryClient, businessId);
      toast.success("Invite revoked successfully");
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.message || "Failed to revoke invite");
    },
  });
}

export function useResendInvite(businessId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      return await edgeRequest(fn("invite-manage"), {
        method: "POST",
        body: JSON.stringify({ inviteId, action: "resend" }),
      });
    },
    onSuccess: () => {
      invalidationHelpers.team(queryClient, businessId);
      toast.success("Invite resent successfully");
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.message || "Failed to resend invite");
    },
  });
}

export function useRedeemInvite() {
  return useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      return await edgeRequest(fn("invite-redeem"), {
        method: "POST",
        body: JSON.stringify({ token }),
      });
    },
    onSuccess: () => {
      toast.success("Invite redeemed successfully");
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.message || "Failed to redeem invite");
    },
  });
}