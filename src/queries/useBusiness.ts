import { useQuery } from '@tanstack/react-query';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { qk } from './keys';
import { toBusinessUI } from './transform';
import { useBizStore } from '@/store/business';
import { useEffect } from 'react';

export function useBusiness(businessId?: string) {
  const { setBusinessFromServer } = useBizStore();
  
  const query = useQuery({
    queryKey: qk.business(businessId || ''),
    queryFn: async () => {
      const { data } = await edgeRequest(fn('get-business'));
      return toBusinessUI(data);
    },
    enabled: !!businessId,
    staleTime: 30_000,
  });

  // Sync successful queries to the store
  useEffect(() => {
    if (query.data) {
      setBusinessFromServer(query.data);
    }
  }, [query.data, setBusinessFromServer]);

  return query;
}