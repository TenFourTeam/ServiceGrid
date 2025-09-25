import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthApi } from "@/hooks/useAuthApi";
import { queryKeys } from "@/queries/keys";

export interface CreateInvitesRequest {
  userIds: string[];
  businessId: string;
  role?: 'worker' | 'owner';
}

export interface CreateInvitesResponse {
  message: string;
  invites: {
    id: string;
    email: string;
    role: string;
    expires_at: string;
  }[];
  skipped: {
    existing_members: number;
    pending_invites: number;
  };
}

export function useCreateInvites() {
  const queryClient = useQueryClient();
  const authApi = useAuthApi();

  return useMutation({
    mutationFn: async ({ userIds, businessId, role = 'worker' }: CreateInvitesRequest) => {
      console.log('[useCreateInvites] Creating invites for users:', userIds);
      
      const { data, error } = await authApi.invoke('create-invites', {
        method: 'POST',
        body: { userIds, businessId, role },
        toast: {
          loading: 'Creating invites...',
          success: 'Invites sent successfully!',
          error: 'Failed to send invites'
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to create invites');
      }
      
      return data as CreateInvitesResponse;
    },
    onSuccess: (data, variables) => {
      // Invalidate invite-related queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.team.invites(variables.businessId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['user-pending-invites'] 
      });
      
      console.log('[useCreateInvites] Successfully created invites:', data);
    },
  });
}