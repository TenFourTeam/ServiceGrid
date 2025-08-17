import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { supabase } from "@/integrations/supabase/client";
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
  email?: string;
  name?: string;
}

interface UseBusinessMembersDataOptions {
  enabled?: boolean;
}

/**
 * Direct Supabase business members hook - leverages RLS policies
 */
export function useBusinessMembersData(opts?: UseBusinessMembersDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.members(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useBusinessMembersData] fetching members via Supabase client");
      
      const { data, error, count } = await supabase
        .from('business_members')
        .select(`
          *,
          profiles!business_members_user_id_fkey (
            email,
            full_name
          )
        `, { count: 'exact' })
        .eq('business_id', businessId)
        .order('role', { ascending: false }) // owners first
        .order('joined_at', { ascending: false });
      
      if (error) {
        console.error("[useBusinessMembersData] error:", error);
        throw new Error(error.message || 'Failed to fetch business members');
      }
      
      // Transform to match expected interface
      const members = data?.map(member => ({
        id: member.id,
        business_id: member.business_id,
        user_id: member.user_id,
        role: member.role,
        invited_at: member.invited_at,
        joined_at: member.joined_at,
        invited_by: member.invited_by,
        email: member.profiles?.email,
        name: member.profiles?.full_name,
      })) || [];
      
      console.info("[useBusinessMembersData] fetched", members.length, "members");
      
      return { members, count: count || 0 };
    },
    staleTime: 30_000,
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

  const inviteWorker = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      toast.loading("Sending invitation...", { id: 'invite-worker' });
      
      // Generate secure token for invitation
      const token = crypto.randomUUID();
      const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
      const hashArray = Array.from(new Uint8Array(tokenHash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Get current user ID for invited_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      
      const { data, error } = await supabase
        .from('invites')
        .insert({
          business_id: businessId,
          email,
          role: 'worker',
          token_hash: hashHex,
          invited_by: user.id,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select()
        .single();
      
      if (error) {
        throw new Error(error.message || 'Failed to invite team member');
      }
      
      toast.success("Team member invited successfully", { id: 'invite-worker' });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.members(businessId || '') });
      queryClient.invalidateQueries({ queryKey: queryKeys.team.invites(businessId || '') });
    },
    onError: (error: any) => {
      console.error('[useInviteWorker] error:', error);
      toast.error("Failed to invite team member", { id: 'invite-worker' });
    },
  });

  const removeMember = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      toast.loading("Removing team member...", { id: 'remove-member' });
      
      const { error } = await supabase
        .from('business_members')
        .delete()
        .eq('id', memberId);
      
      if (error) {
        throw new Error(error.message || 'Failed to remove team member');
      }
      
      toast.success("Team member removed successfully", { id: 'remove-member' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.members(businessId || '') });
    },
    onError: (error: any) => {
      console.error('[useRemoveMember] error:', error);
      toast.error("Failed to remove team member", { id: 'remove-member' });
    },
  });

  return {
    inviteWorker,
    removeMember,
  };
}