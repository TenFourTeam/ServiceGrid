import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys, invalidationHelpers } from "@/queries/keys";
import { toast } from "sonner";

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: 'owner' | 'worker';
  invited_at: string;
  joined_at: string | null;
  invited_by: string | null;
  email?: string;
  name?: string;
}

export function useBusinessMembers(businessId?: string, opts?: { enabled?: boolean }) {
  const { isSignedIn, getToken } = useClerkAuth();
  const enabled = !!isSignedIn && !!businessId && (opts?.enabled ?? true);

  return useQuery<{ members: BusinessMember[] } | null, Error>({
    queryKey: queryKeys.team.members(businessId || ''),
    enabled,
    queryFn: async () => {
      if (!businessId) return null;
      const data = await edgeRequest(fn(`business-members?business_id=${businessId}`));
      return data || { members: [] };
    },
    staleTime: 30_000,
  });
}

export function useInviteWorker() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ businessId, email }: { businessId: string; email: string }) => {
      return await edgeRequest(fn("invite-worker"), {
        method: "POST",
        body: JSON.stringify({ businessId, email }),
      });
    },
    onSuccess: (_, { businessId }) => {
      invalidationHelpers.team(queryClient, businessId);
      toast.success("Team member invited successfully");
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.message || "Failed to invite team member");
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ businessId, memberId }: { businessId: string; memberId: string }) => {
      return await edgeRequest(fn(`business-members/${memberId}`), {
        method: "DELETE",
      });
    },
    onSuccess: (_, { businessId }) => {
      invalidationHelpers.team(queryClient, businessId);
      toast.success("Team member removed successfully");
    },
    onError: (error: any) => {
      console.error(error);
      toast.error(error?.message || "Failed to remove team member");
    },
  });
}