import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import type { BusinessMember } from '@/hooks/useBusinessMembers';

// Canonical query key for business members
export const qkMembers = (businessId: string) => ['business-members', { businessId }] as const;

export function useRemoveMember(businessId: string) {
  const qc = useQueryClient();
  const authApi = useAuthApi();
  const key = qkMembers(businessId);

  return useMutation({
    mutationFn: async (member: BusinessMember) => {
      if (member.role !== 'worker') {
        throw new Error('Only workers can be removed');
      }

      const { data, error } = await authApi.invoke('business-members', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-business-id': businessId,
        },
        body: { memberId: member.id },
      });

      if (error) {
        const msg = error.message || 'Remove failed';
        throw new Error(msg);
      }
      
      return member; // echo back for optimistic update bookkeeping
    },

    // Optimistic removal
    onMutate: async (member) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<BusinessMember[]>(key) ?? [];
      qc.setQueryData<BusinessMember[]>(key, (old = []) => old.filter(m => m.id !== member.id));
      return { prev };
    },

    onError: (err, _member, ctx) => {
      if (ctx?.prev) qc.setQueryData<BusinessMember[]>(key, ctx.prev);
      
      const errorMessage = err instanceof Error ? err.message : "There was an error removing the team member";
      toast.error("Failed to remove member", {
        description: errorMessage
      });
    },

    onSuccess: () => {
      // Keep it simple: revalidate active observers; data stays visible due to placeholderData
      qc.invalidateQueries({ queryKey: key, refetchType: 'active' });
      
      // Also invalidate user businesses in case role changed
      qc.invalidateQueries({ queryKey: ['user-businesses'] });
      
      toast.success("Team member removed successfully");
    },

    onSettled: () => {
      // Belt-and-suspenders: ensure we refetch if needed
      qc.refetchQueries({ queryKey: key, type: 'active' });
    },
  });
}
