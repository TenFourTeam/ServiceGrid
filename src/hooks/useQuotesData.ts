import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuthApi } from "@/hooks/useAuthApi";

import type { QuoteListItem } from '@/types';

interface UseQuotesDataOptions {
  enabled?: boolean;
}

/**
 * Edge Function quotes hook - unified Clerk authentication
 */
export function useQuotesData(opts?: UseQuotesDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.quotes(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useQuotesData] fetching quotes via edge function");
      
      const { data, error } = await authApi.invoke('quotes-crud', {
        method: 'GET',
        headers: {
          'x-business-id': businessId
        }
      });
      
      if (error) {
        console.error("[useQuotesData] error:", error);
        throw new Error(error.message || 'Failed to fetch quotes');
      }
      
      console.info("[useQuotesData] fetched", data?.quotes?.length || 0, "quotes");
      
      return { quotes: data?.quotes || [], count: data?.count || 0 };
    },
    staleTime: 30_000,
  });

  return {
    data: query.data?.quotes ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}