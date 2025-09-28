import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { queryKeys } from '@/queries/keys';
import type { BusinessMember } from '@/hooks/useBusinessMembers';

export function useRemoveMember(businessId: string) {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();
  const membersKey = queryKeys.team.members(businessId);

  return useMutation({
    mutationFn: async (member: BusinessMember) => {
      // Only allow removing workers on the client
      if (member.role !== 'worker') {
        throw new Error('Only workers can be removed');
      }

      console.log('[useRemoveMember] Removing member:', member.id);
      
      const { data, error } = await authApi.invoke('business-members', {
        method: 'DELETE',
        headers: {
          'x-business-id': businessId
        },
        body: { memberId: member.id }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to remove member');
      }
      
      return { member, response: data };
    },

    // Optimistic update
    onMutate: async (member) => {
      await queryClient.cancelQueries({ queryKey: membersKey });
      
      const previousMembers = queryClient.getQueryData<{ data: BusinessMember[]; count: number }>(membersKey);
      
      if (previousMembers) {
        queryClient.setQueryData<{ data: BusinessMember[]; count: number }>(membersKey, {
          data: previousMembers.data.filter(m => m.id !== member.id),
          count: previousMembers.count - 1
        });
      }
      
      return { previousMembers };
    },

    onError: (error, member, context) => {
      console.error('[useRemoveMember] Error removing member:', error);
      
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
}