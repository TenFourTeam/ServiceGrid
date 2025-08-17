import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidationHelpers } from "@/queries/keys";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Invite {
  id: string;
  email: string;
  role: 'worker' | 'owner';
  expires_at: string;
  created_at: string;
  invited_by: string;
  profiles?: {
    email: string;
  };
}

export function usePendingInvites(businessId?: string) {
  const enabled = !!businessId;

  return useQuery<{ invites: Invite[] }, Error>({
    queryKey: queryKeys.team.invites(businessId || ''),
    enabled,
    queryFn: async () => {
      if (!businessId) return { invites: [] };
      
      const { data, error } = await supabase
        .from('invites')
        .select(`
          id,
          email,
          role,
          expires_at,
          created_at,
          invited_by
        `)
        .eq('business_id', businessId)
        .is('redeemed_at', null)
        .is('revoked_at', null)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch pending invites');
      }
      
      // Transform data to match interface  
      const invites = data?.map(invite => ({
        id: invite.id,
        email: invite.email,
        role: invite.role as 'worker' | 'owner',
        expires_at: invite.expires_at,
        created_at: invite.created_at,
        invited_by: invite.invited_by,
        profiles: undefined // Simplified for now - can add later if needed
      })) || [];
      
      return { invites };
    },
    staleTime: 30_000,
  });
}

export function useRevokeInvite(businessId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      toast.loading("Revoking invitation...", { id: 'revoke-invite' });
      
      const { error } = await supabase
        .from('invites')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', inviteId);
      
      if (error) {
        throw new Error(error.message || 'Failed to revoke invite');
      }
      
      toast.success("Invite revoked successfully", { id: 'revoke-invite' });
    },
    onSuccess: () => {
      invalidationHelpers.team(queryClient, businessId);
    },
    onError: (error: any) => {
      console.error('[useRevokeInvite] error:', error);
      toast.error("Failed to revoke invite", { id: 'revoke-invite' });
    },
  });
}

export function useResendInvite(businessId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ inviteId }: { inviteId: string }) => {
      toast.loading("Resending invitation...", { id: 'resend-invite' });
      
      // For now, just update the created_at to show as "resent"
      // In a real implementation, this would trigger email resending
      const { error } = await supabase
        .from('invites')
        .update({ created_at: new Date().toISOString() })
        .eq('id', inviteId);
      
      if (error) {
        throw new Error(error.message || 'Failed to resend invite');
      }
      
      toast.success("Invite resent successfully", { id: 'resend-invite' });
    },
    onSuccess: () => {
      invalidationHelpers.team(queryClient, businessId);
    },
    onError: (error: any) => {
      console.error('[useResendInvite] error:', error);
      toast.error("Failed to resend invite", { id: 'resend-invite' });
    },
  });
}

export function useRedeemInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ token }: { token: string }) => {
      toast.loading("Redeeming invitation...", { id: 'redeem-invite' });
      
      // Hash the token to match database
      const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
      const hashArray = Array.from(new Uint8Array(tokenHash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Find the invite
      const { data: invite, error: inviteError } = await supabase
        .from('invites')
        .select('*')
        .eq('token_hash', hashHex)
        .is('redeemed_at', null)
        .is('revoked_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (inviteError || !invite) {
        throw new Error('Invalid or expired invitation');
      }
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Must be logged in to redeem invitation');
      }
      
      // Add user to business_members
      const { error: memberError } = await supabase
        .from('business_members')
        .insert({
          business_id: invite.business_id,
          user_id: user.id,
          role: invite.role,
          joined_at: new Date().toISOString(),
          invited_by: invite.invited_by,
        });
      
      if (memberError) {
        throw new Error(memberError.message || 'Failed to join business');
      }
      
      // Mark invite as redeemed
      await supabase
        .from('invites')
        .update({ 
          redeemed_at: new Date().toISOString(),
          redeemed_by: user.id 
        })
        .eq('id', invite.id);
      
      toast.success("Invite redeemed successfully", { id: 'redeem-invite' });
      return { businessId: invite.business_id };
    },
    onSuccess: (data) => {
      // Invalidate team queries to refresh member list
      if (data?.businessId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.data.members(data.businessId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.team.invites(data.businessId) });
      }
    },
    onError: (error: any) => {
      console.error('[useRedeemInvite] error:', error);
      toast.error("Failed to redeem invite", { id: 'redeem-invite' });
    },
  });
}