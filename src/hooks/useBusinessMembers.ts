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
  businessId?: string;
}

/**
 * Edge Function business members hook - unified Clerk authentication
 */
export function useBusinessMembersData(opts?: UseBusinessMembersDataOptions) {
  const { isAuthenticated, businessId: contextBusinessId } = useBusinessContext();
  const authApi = useAuthApi();
  
  // Use explicit businessId if provided, fallback to context
  const businessId = opts?.businessId || contextBusinessId;
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);


  const query = useQuery({
    queryKey: queryKeys.data.members(businessId || ''),
    enabled,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('business-members', {
        method: 'GET'
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch business members');
      }

      // Debug: Log the actual response structure
      console.log('[useBusinessMembers] Raw response:', { data, error });
      console.log('[useBusinessMembers] Data keys:', data ? Object.keys(data) : 'no data');
      
      return {
        members: data?.data?.data || [],
        count: data?.data?.count || 0
      };
    },
    staleTime: 30_000, // Simplified from 0 to match profile query
    retry: 2,
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

  // Note: inviteWorker functionality removed - use EnhancedInviteModal instead

  const removeMember = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const { data, error } = await authApi.invoke('business-members', {
        method: "DELETE",
        body: { memberId }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to remove team member');
      }
      
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
    onSuccess: () => {
      // Invalidate related queries that need fresh data
      queryClient.invalidateQueries({ 
        queryKey: ['user-businesses'],
        exact: true 
      });
    },
    onError: (error: Error | unknown, variables, context) => {
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