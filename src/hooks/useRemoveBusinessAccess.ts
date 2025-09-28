import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import type { UserBusiness } from '@/hooks/useUserBusinesses';
import { useProfile } from '@/queries/useProfile';

// Canonical query key for user businesses
export const qkUserBusinesses = () => ['user-businesses'] as const;

export function useRemoveBusinessAccess() {
  const qc = useQueryClient();
  const authApi = useAuthApi();
  const key = qkUserBusinesses();
  const { data: profile } = useProfile();

  return useMutation({
    mutationFn: async (business: UserBusiness) => {
      if (business.role !== 'worker') {
        throw new Error('Only workers can leave businesses');
      }

      if (!profile?.profile?.id) {
        throw new Error('User profile not found');
      }

      console.log('[useRemoveBusinessAccess] Sending request:', {
        businessId: business.id,
        memberId: `worker-${profile.profile.id}`,
        businessRole: business.role
      });

      const { data, error } = await authApi.invoke('business-members', {
        method: 'DELETE',
        headers: {
          'x-business-id': business.id,
        },
        body: { memberId: `worker-${profile.profile.id}` },
      });

      console.log('[useRemoveBusinessAccess] Response:', { data, error });

      if (error) {
        const msg = error.message || error || 'Leave business failed';
        throw new Error(msg);
      }
      
      return business; // echo back for optimistic update bookkeeping
    },

    // Optimistic removal
    onMutate: async (business) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<UserBusiness[]>(key) ?? [];
      qc.setQueryData<UserBusiness[]>(key, (old = []) => old.filter(b => b.id !== business.id));
      return { prev };
    },

    onError: (err, _business, ctx) => {
      if (ctx?.prev) qc.setQueryData<UserBusiness[]>(key, ctx.prev);
      
      const errorMessage = err instanceof Error ? err.message : "There was an error leaving the business";
      toast.error("Failed to leave business", {
        description: errorMessage
      });
    },

    onSuccess: () => {
      // Keep it simple: revalidate active observers; data stays visible due to placeholderData
      qc.invalidateQueries({ queryKey: key, refetchType: 'active' });
      
      // Also invalidate profile in case default business changed
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['user-pending-invites'] });
      
      toast.success("You have left the business");
    },

    onSettled: () => {
      // Belt-and-suspenders: ensure we refetch if needed
      qc.refetchQueries({ queryKey: key, type: 'active' });
    },
  });
}