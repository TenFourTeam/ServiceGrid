import { useQuery } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuthApi } from "@/hooks/useAuthApi";
import { qkMembers } from "@/hooks/useRemoveMember";

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
 * Resilient business members hook with canonical query key
 */
export function useBusinessMembersData(opts: UseBusinessMembersDataOptions = {}) {
  const authApi = useAuthApi();
  
  // Use explicit businessId from options
  const businessId = opts?.businessId;
  const enabled = !!businessId && (opts?.enabled ?? true);

  // Debug logging
  console.log('[useBusinessMembers] Hook setup:', { 
    businessId, 
    enabled,
    optsEnabled: opts?.enabled 
  });

  const query = useQuery({
    queryKey: businessId ? qkMembers(businessId) : ['business-members', { businessId: null }],
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

      // Robust parsing (covers mis-labeled JSON)
      let payload = data?.data ?? data;
      if (typeof payload === 'string' && /^\s*[{[]/.test(payload)) {
        try { payload = JSON.parse(payload); } catch {}
      }

      const members = Array.isArray(payload) ? payload
        : Array.isArray(payload?.data) ? payload.data
        : [];

      console.log('[useBusinessMembers] Normalized members:', members?.length || 0);
      
      return members.map((member: any) => ({
        id: String(member.id),
        business_id: String(member.business_id),
        user_id: String(member.user_id),
        role: String(member.role),
        invited_at: member.invited_at ? String(member.invited_at) : null,
        joined_at: member.joined_at ? String(member.joined_at) : null,
        invited_by: member.invited_by ? String(member.invited_by) : null,
        joined_via_invite: Boolean(member.joined_via_invite),
        email: member.email ? String(member.email) : null,
        name: member.name ? String(member.name) : null,
      }));
    },

    // Prevent "freeze"/flicker when invalidating/refetching
    placeholderData: (prev) => prev,    // keep last array during refetch
    staleTime: 30_000,
    gcTime: 5 * 60_000,
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

// Legacy hook - use useRemoveMember for new code
export function useBusinessMemberOperations() {
  // This hook is deprecated in favor of useRemoveMember
  // Keeping for backwards compatibility
  return {};
}