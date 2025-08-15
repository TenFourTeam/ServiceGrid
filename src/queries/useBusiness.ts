import { useQuery } from '@tanstack/react-query';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { queryKeys } from './keys';
import { toBusinessUI } from './transform';

export type BusinessUI = {
  id: string;
  name: string;
  phone?: string;
  replyToEmail?: string;
  taxRateDefault?: number;
  role?: 'owner' | 'worker';
  [key: string]: any;
};

/**
 * Unified business query hook
 * This replaces fragmented business state management
 */
export function useBusiness() {
  return useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: async () => {
      console.info('[useBusiness] fetching business from database');
      const response = await edgeRequest(fn('get-business'));
      const business = toBusinessUI(response.business) as BusinessUI;
      business.role = response.role;
      return business;
    },
    staleTime: 30_000,
    retry: 2,
  });
}
