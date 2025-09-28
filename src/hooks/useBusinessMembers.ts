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

  // Debug logging
  console.log('[useBusinessMembers] Hook setup:', { 
    businessId, 
    contextBusinessId: contextBusinessId,
    isAuthenticated, 
    enabled,
    optsEnabled: opts?.enabled 
  });


  const query = useQuery({
    queryKey: ['business-members', businessId],
    enabled,
    queryFn: async () => {
      console.log('[useBusinessMembers] Executing query for businessId:', businessId);
      const { data, error } = await authApi.invoke('business-members', {
        method: 'GET',
        headers: { 'x-business-id': businessId! }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch business members');
      }

      // Debug: Log the actual response structure
      console.log('[useBusinessMembers] Raw response:', { data, error });
      console.log('[useBusinessMembers] Data keys:', data ? Object.keys(data) : 'no data');
      
      // Normalize response - handle various nesting levels
      const payload = data?.data ?? data;
      const members = Array.isArray(payload) 
        ? payload 
        : Array.isArray(payload?.data) 
        ? payload.data 
        : [];

      console.log('[useBusinessMembers] Normalized members:', members?.length || 0);
      
      return members.map((member: any) => ({
        ...member,
        invited_at: member.invited_at ?? null,
        joined_at: member.joined_at ?? null,
      }));
    },
    staleTime: 30_000, // Simplified from 0 to match profile query
    retry: 2,
  });

  return {
    data: query.data ?? [],
    count: query.data?.length ?? 0,
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
      const queryKey = ['business-members', businessId];
      await queryClient.cancelQueries({ queryKey });
      
      // Snapshot the previous value for rollback
      const previousMembers = queryClient.getQueryData(queryKey);
      
      // Optimistically update by removing the member (works with flat array)
      queryClient.setQueryData(queryKey, (old: BusinessMember[] | undefined) => {
        if (!Array.isArray(old)) return old;
        return old.filter((member: BusinessMember) => member.id !== memberId);
      });
      
      return { previousMembers };
    },
    onSuccess: () => {
      // Invalidate the business members query to ensure fresh data
      queryClient.invalidateQueries({ 
        queryKey: ['business-members', businessId] 
      });
      // Also invalidate user businesses in case role changed
      queryClient.invalidateQueries({ 
        queryKey: ['user-businesses'] 
      });
      
      toast.success("Team member removed successfully");
    },
    onError: (error: Error | unknown, variables, context) => {
      // Rollback optimistic update on error
      if (context?.previousMembers) {
        queryClient.setQueryData(['business-members', businessId], context.previousMembers);
      }
      
      const errorMessage = error instanceof Error ? error.message : "There was an error removing the team member";
      toast.error("Failed to remove member", {
        description: errorMessage
      });
    },
  });

  return {
    removeMember,
  };
}