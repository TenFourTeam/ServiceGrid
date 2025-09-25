import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuthApi } from "@/hooks/useAuthApi";
import { queryKeys } from "@/queries/keys";
import { toast } from "sonner";

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

  // Note: inviteWorker functionality removed - use UserSelectionInviteModal instead

  const removeMember = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      console.log('[useBusinessMemberOperations] Starting member deletion:', memberId);
      
      const { data, error } = await authApi.invoke('business-members', {
        method: "DELETE",
        body: { memberId }
      });
      
      if (error) {
        console.error('[useBusinessMemberOperations] Edge function error:', error);
        throw new Error(error.message || 'Failed to remove team member');
      }
      
      console.log('[useBusinessMemberOperations] Member deletion successful:', data);
      return data;
    },
    onMutate: async ({ memberId }) => {
      // Cancel any outgoing refetches to prevent race conditions
      await queryClient.cancelQueries({ queryKey: queryKeys.data.members(businessId || '') });
      
      // Snapshot the previous value for rollback
      const previousMembers = queryClient.getQueryData(queryKeys.data.members(businessId || ''));
      
      // Optimistically update by removing the member
      queryClient.setQueryData(queryKeys.data.members(businessId || ''), (old: any) => {
        if (!old?.members) return old;
        return {
          ...old,
          members: old.members.filter((member: BusinessMember) => member.id !== memberId),
          count: Math.max(0, (old.count || 0) - 1)
        };
      });
      
      return { previousMembers };
    },
    onSuccess: (data, variables) => {
      console.log('[useBusinessMemberOperations] Member removal completed successfully');
      // Don't invalidate business-members since we already updated optimistically
      // Only invalidate related queries that need fresh data
      queryClient.invalidateQueries({ 
        queryKey: ['user-businesses'],
        exact: true 
      });
    },
    onError: (error: Error | unknown, variables, context) => {
      console.error('[useBusinessMemberOperations] Mutation error:', error);
      
      // Rollback optimistic update on error
      if (context?.previousMembers) {
        queryClient.setQueryData(queryKeys.data.members(businessId || ''), context.previousMembers);
      }
    },
  });

  return {
    removeMember,
  };
}