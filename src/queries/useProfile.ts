import { useQuery } from '@tanstack/react-query';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { queryKeys } from './keys';
import { toProfileUI } from './transform';

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: async () => {
      console.info('[useProfile] fetching profile from database');
      const data = await edgeRequest(fn('profile-get'));
      return toProfileUI(data);
    },
    staleTime: 30_000,
    retry: 2,
  });
}