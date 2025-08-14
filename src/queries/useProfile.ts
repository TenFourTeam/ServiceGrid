import { useQuery } from '@tanstack/react-query';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';

export function useProfile() {
  return useQuery({
    queryKey: ['profile.current'],
    queryFn: async () => {
      console.info('[useProfile] fetching profile from database');
      return await edgeRequest(fn('profile-get'));
    },
    staleTime: 30_000,
  });
}