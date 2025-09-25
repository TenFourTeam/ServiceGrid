import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuthApi } from "@/hooks/useAuthApi";
import { queryKeys } from "@/queries/keys";

export interface BusinessMember {
  id: string;
  business_id: string;
  user_id: string;
  role: 'owner' | 'worker';
  invited_at: string;
  joined_at: string | null;
  invited_by: string | null;
  joined_via_invite: boolean;
  email?: string;
  name?: string;
}

interface UseBusinessMembersDataOptions {
  enabled?: boolean;
}

/**
 * Edge Function business members hook - unified Clerk authentication
 */
export function useBusinessMembersData(opts?: UseBusinessMembersDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.members(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useBusinessMembersData] fetching members via edge function");
      
      const { data, error } = await authApi.invoke('business-members', {
        method: 'GET'
      });
      
      if (error) {
        console.error("[useBusinessMembersData] error:", error);
        throw new Error(error.message || 'Failed to fetch business members');
      }
      
      console.info("[useBusinessMembersData] fetched", data?.members?.length || 0, "members");
      
      return { members: data?.members || [], count: data?.count || 0 };
    },
    staleTime: 30_000,
  });

  return {
    data: query.data?.members ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useBusinessMemberOperations() {
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();

  const inviteWorker = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const { data, error } = await authApi.invoke('invite-worker', {
        method: "POST",
        body: { businessId, email }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to invite team member');
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.members(businessId || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.team.invites(businessId || '') });
    },
    onError: (error: Error | unknown) => {
      console.error('[useInviteWorker] error:', error);
    },
  });

  const removeMember = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      console.log('[useBusinessMemberOperations] Starting member deletion:', memberId);
      
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
        console.error('[useBusinessMemberOperations] Edge function error:', error);
        throw new Error(error.message || 'Failed to remove team member');
      }
      
      console.log('[useBusinessMemberOperations] Member deletion successful:', data);
      return data;
    },
    onSuccess: (data, variables) => {
      console.log('[useBusinessMemberOperations] Invalidating queries after member removal');
      // Use more specific invalidation to prevent loops
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.data.members(businessId || ''),
        exact: true 
      });
      // Also invalidate user businesses to update member counts
      queryClient.invalidateQueries({ 
        queryKey: ['user-businesses'],
        exact: true 
      });
    },
    onError: (error: Error | unknown) => {
      console.error('[useBusinessMemberOperations] Mutation error:', error);
    },
  });

  return {
    inviteWorker,
    removeMember,
  };
}