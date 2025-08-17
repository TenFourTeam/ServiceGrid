import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { queryKeys, invalidationHelpers } from "@/queries/keys";
import { createAuthEdgeApi } from "@/utils/authEdgeApi";

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
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const enabled = !!isSignedIn && !!businessId && (opts?.enabled ?? true);

  return useQuery<{ members: BusinessMember[] } | null, Error>({
    queryKey: queryKeys.team.members(businessId || ''),
    enabled,
    queryFn: async () => {
      if (!businessId) return null;
      
      const { data, error } = await authApi.invoke('business-members', {
        method: 'GET'
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch business members');
      }
      
      return data || { members: [] };
    },
    staleTime: 30_000,
  });
}

export function useInviteWorker() {
  const queryClient = useQueryClient();
  const { getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  
  return useMutation({
    mutationFn: async ({ businessId, email }: { businessId: string; email: string }) => {
      const { data, error } = await authApi.invoke("invite-worker", {
        method: "POST",
        body: { businessId, email },
        toast: {
          success: "Team member invited successfully",
          loading: "Sending invitation...",
          error: "Failed to invite team member"
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to invite team member');
      }
      
      return data;
    },
    onSuccess: (_, { businessId }) => {
      invalidationHelpers.team(queryClient, businessId);
    },
    onError: (error: any) => {
      console.error('[useInviteWorker] error:', error);
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  
  return useMutation({
    mutationFn: async ({ businessId, memberId }: { businessId: string; memberId: string }) => {
      const { data, error } = await authApi.invoke('business-members', {
        method: "DELETE",
        body: { memberId },
        toast: {
          success: "Team member removed successfully",
          loading: "Removing team member...",
          error: "Failed to remove team member"
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to remove team member');
      }
      
      return data;
    },
    onSuccess: (_, { businessId }) => {
      invalidationHelpers.team(queryClient, businessId);
    },
    onError: (error: any) => {
      console.error('[useRemoveMember] error:', error);
    },
  });
}