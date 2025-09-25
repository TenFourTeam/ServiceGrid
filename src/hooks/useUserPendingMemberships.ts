import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

export interface PendingMembership {
  id: string;
  business_id: string;
  role: 'owner' | 'worker';
  invited_at: string;
  invited_by: string | null;
  business_name: string;
  business_description?: string;
}

/**
 * Hook to fetch pending memberships for the current user
 */
export function useUserPendingMemberships() {
  const authApi = useAuthApi();

  return useQuery<PendingMembership[], Error>({
    queryKey: ['user-pending-memberships'],
    queryFn: async () => {
      const { data, error } = await authApi.invoke('user-businesses', {
        method: 'GET'
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch pending memberships');
      }
      
      // Filter for pending memberships (where joined_at is null)
      const pending = (data || []).filter((membership: any) => 
        membership.joined_at === null
      ).map((membership: any) => ({
        id: membership.id,
        business_id: membership.business_id,
        role: membership.role,
        invited_at: membership.invited_at,
        invited_by: membership.invited_by,
        business_name: membership.name,
        business_description: membership.description
      }));
      
      return pending;
    },
    staleTime: 30_000,
  });
}

/**
 * Hook to respond to (accept/reject) membership requests
 */
export function useRespondToMembership() {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();

  return useMutation({
    mutationFn: async ({ businessId, action }: { 
      businessId: string; 
      action: 'accept' | 'reject';
    }) => {
      const { data, error } = await authApi.invoke('respond-to-membership', {
        method: 'POST',
        body: { businessId, action },
        toast: {
          success: action === 'accept' 
            ? "Membership accepted successfully!" 
            : "Membership rejected",
          loading: action === 'accept' 
            ? "Accepting membership..." 
            : "Rejecting membership...",
          error: `Failed to ${action} membership`
        }
      });
      
      if (error) {
        throw new Error(error.message || `Failed to ${action} membership`);
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['user-pending-memberships'] });
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['business-members'] });
    },
  });
}