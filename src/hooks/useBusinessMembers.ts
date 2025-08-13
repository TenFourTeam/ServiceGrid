import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeFetchJson } from "@/utils/edgeApi";

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
    queryKey: ["business-members", businessId],
    enabled,
    queryFn: async () => {
      if (!businessId) return null;
      const data = await edgeFetchJson(`business-members?business_id=${businessId}`, getToken);
      return data || { members: [] };
    },
    staleTime: 30_000,
  });
}

export function useInviteWorker() {
  const { getToken } = useClerkAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ businessId, email }: { businessId: string; email: string }) => {
      return await edgeFetchJson("invite-worker", getToken, {
        method: "POST",
        body: JSON.stringify({ businessId, email }),
      });
    },
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({ queryKey: ["business-members", businessId] });
    },
  });
}

export function useRemoveMember() {
  const { getToken } = useClerkAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ businessId, memberId }: { businessId: string; memberId: string }) => {
      return await edgeFetchJson(`business-members/${memberId}`, getToken, {
        method: "DELETE",
      });
    },
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({ queryKey: ["business-members", businessId] });
    },
  });
}