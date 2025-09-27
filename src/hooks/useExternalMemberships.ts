import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';

export interface ExternalMembership {
  id: string;
  name: string;
  logo_url?: string;
  role: 'worker'; // Always worker for external memberships
  joined_at: string;
  is_current: boolean;
}

/**
 * Hook to fetch external business memberships where user is a worker
 * Now uses accepted invites instead of business_members table
 */
export function useExternalMemberships() {
  const authApi = useAuthApi();

  return useQuery<ExternalMembership[], Error>({
    queryKey: ['external-memberships'],
    queryFn: async () => {
      const { data, error } = await authApi.invoke('user-businesses', {
        method: 'GET'
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to fetch external memberships');
      }

      const businesses = data || [];
      
      // Filter to only worker memberships (exclude owned businesses)
      const externalMemberships = businesses.filter((business: any) => 
        business.role === 'worker'
      );
      
      return externalMemberships;
    },
    staleTime: 30_000,
  });
}