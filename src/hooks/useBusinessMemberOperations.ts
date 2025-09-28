import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from './useBusinessContext';
import { queryKeys } from '@/queries/keys';
import type { BusinessMember } from './useBusinessMembers';

/**
 * Bridge hook for business member operations
 * Provides consistent interface for member management operations
 */
export function useBusinessMemberOperations() {
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();
  const authApi = useAuthApi();
  const membersKey = queryKeys.team.members(businessId);

  const removeMember = useMutation({
    mutationFn: async (params: { memberId: string }) => {
      console.log('[useBusinessMemberOperations] Removing member:', params.memberId);
      
      const { data, error } = await authApi.invoke('business-members', {
        method: 'DELETE',
        headers: {
          'x-business-id': businessId
        },
        body: { memberId: params.memberId }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to remove member');
      }
      
      return { memberId: params.memberId, response: data };
    },

    // Optimistic update
    onMutate: async (params) => {
      await queryClient.cancelQueries({ queryKey: membersKey });
      
      const previousMembers = queryClient.getQueryData<{ data: BusinessMember[]; count: number }>(membersKey);
      
      if (previousMembers) {
        queryClient.setQueryData<{ data: BusinessMember[]; count: number }>(membersKey, {
          data: previousMembers.data.filter(m => m.id !== params.memberId),
          count: previousMembers.count - 1
        });
      }
      
      return { previousMembers };
    },

    onError: (error, params, context) => {
      console.error('[useBusinessMemberOperations] Error removing member:', error);
      
      // Rollback optimistic update
      if (context?.previousMembers) {
        queryClient.setQueryData(membersKey, context.previousMembers);
      }
    },

    onSettled: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: membersKey });
      queryClient.invalidateQueries({ queryKey: queryKeys.team.invites(businessId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.team.userBusinesses() });
      queryClient.invalidateQueries({ queryKey: queryKeys.data.jobs(businessId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.business.auditLogs(businessId) });
    }
  });

  return {
    removeMember
  };
}