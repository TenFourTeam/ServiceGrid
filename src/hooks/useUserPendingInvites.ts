import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthApi } from "@/hooks/useAuthApi";

export interface PendingInvite {
  id: string;
  business_id: string;
  role: 'worker' | 'owner';
  expires_at: string;
  created_at: string;
  email: string;
  businesses: {
    id: string;
    name: string;
    logo_url?: string;
  };
}

export function useUserPendingInvites() {
  const authApi = useAuthApi();

  return useQuery<{ invites: PendingInvite[] }, Error>({
    queryKey: ['user-pending-invites'],
    queryFn: async () => {
      const { data, error } = await authApi.invoke('user-pending-invites', {
        method: 'GET'
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch pending invites');
      }
      
      return data || { invites: [] };
    },
    staleTime: 30_000,
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();
  
  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      const { data, error } = await authApi.invoke("invite-accept", {
        method: "POST",
        body: { inviteId },
        toast: {
          success: "Invitation accepted successfully",
          loading: "Accepting invitation...",
          error: "Failed to accept invitation"
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to accept invite');
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate pending invites and user businesses
      queryClient.invalidateQueries({ queryKey: ['user-pending-invites'] });
      queryClient.invalidateQueries({ queryKey: ['user-businesses'] });
      // Invalidate profile queries to update role context
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
    onError: (error: Error | unknown) => {
      console.error('[useAcceptInvite] error:', error);
    },
  });
}

export function useDeclineInvite() {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();
  
  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      const { data, error } = await authApi.invoke("invite-decline", {
        method: "POST",
        body: { inviteId },
        toast: {
          success: "Invitation declined",
          loading: "Declining invitation...",
          error: "Failed to decline invitation"
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to decline invite');
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate pending invites
      queryClient.invalidateQueries({ queryKey: ['user-pending-invites'] });
    },
    onError: (error: Error | unknown) => {
      console.error('[useDeclineInvite] error:', error);
    },
  });
}