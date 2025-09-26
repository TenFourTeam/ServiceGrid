import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

export interface InviteUser {
  id: string;
  email: string;
  full_name?: string;
}

export interface InviteUserSearchResponse {
  users: InviteUser[];
  metadata: {
    totalProfiles: number;
    existingMembers: number;
    pendingInvites: number;
    availableForInvite: number;
    searchQuery: string | null;
  };
}

/**
 * Hook to search for users available to invite to a business
 */
export function useInviteUserSearch(businessId?: string, searchQuery = '') {
  const authApi = useAuthApi();

  return useQuery<InviteUserSearchResponse, Error>({
    queryKey: ['search-invite-users', businessId, searchQuery],
    queryFn: async () => {
      if (!businessId) {
        throw new Error('Business ID is required to search for users to invite');
      }

      const { data, error } = await authApi.invoke('search-invite-users', {
        method: 'GET',
        queryParams: { businessId, search: searchQuery }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to search for users');
      }
      
      return data || { users: [], metadata: { totalProfiles: 0, existingMembers: 0, pendingInvites: 0, availableForInvite: 0, searchQuery: null } };
    },
    staleTime: 30_000, // Cache for 30 seconds
    enabled: !!businessId, // Only run query when businessId is available
  });
}