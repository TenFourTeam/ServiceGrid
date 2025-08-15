import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys, invalidationHelpers } from "@/queries/keys";
import { useStandardMutation } from "@/mutations/useStandardMutation";

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
  return useStandardMutation<any, { businessId: string; email: string }>({
    mutationFn: async ({ businessId, email }) => {
      return await edgeRequest(fn("invite-worker"), {
        method: "POST",
        body: JSON.stringify({ businessId, email }),
      });
    },
    onSuccess: (_, { businessId }, queryClient) => {
      invalidationHelpers.team(queryClient, businessId);
    },
    successMessage: "Team member invited successfully",
    errorMessage: "Failed to invite team member",
  });
}

export function useRemoveMember() {
  return useStandardMutation<any, { businessId: string; memberId: string }>({
    mutationFn: async ({ businessId, memberId }) => {
      return await edgeRequest(fn(`business-members/${memberId}`), {
        method: "DELETE",
      });
    },
    onSuccess: (_, { businessId }, queryClient) => {
      invalidationHelpers.team(queryClient, businessId);
    },
    successMessage: "Team member removed successfully",
    errorMessage: "Failed to remove team member",
  });
}