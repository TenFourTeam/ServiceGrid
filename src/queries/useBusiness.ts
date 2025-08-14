import { useQuery } from '@tanstack/react-query';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { queryKeys } from './keys';
import { toBusinessUI } from './transform';

export type BusinessUI = {
  id: string;
  name: string;
  nameCustomized: boolean;
  phone?: string;
  replyToEmail?: string;
  taxRateDefault?: number;
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
      const data = await edgeRequest(fn('get-business'));
      return toBusinessUI(data) as BusinessUI;
    },
    staleTime: 30_000,
    retry: 2,
  });
}

/**
 * Business name customization status selector
 * Single source of truth for nameCustomized
 */
export function useBusinessNameCustomized(): boolean {
  const { data: business } = useBusiness();
  return business?.nameCustomized ?? false;
}