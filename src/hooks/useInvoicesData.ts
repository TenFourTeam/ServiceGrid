import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuthApi } from "@/hooks/useAuthApi";
import type { Invoice } from '@/types';

interface UseInvoicesDataOptions {
  enabled?: boolean;
}

/**
 * Edge Function invoices hook - unified Clerk authentication
 */
export function useInvoicesData(opts?: UseInvoicesDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  // Debug logging
  console.log('[useInvoicesData] Hook state:', {
    isAuthenticated,
    businessId,
    enabled,
    optsEnabled: opts?.enabled
  });

  const query = useQuery({
    queryKey: queryKeys.data.invoices(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useInvoicesData] fetching invoices via edge function");
      
      const { data, error } = await authApi.invoke('invoices-crud', {
        method: 'GET',
        headers: {
          'x-business-id': businessId
        }
      });
      
      if (error) {
        console.error("[useInvoicesData] error:", error);
        throw new Error(error.message || 'Failed to fetch invoices');
      }
      
      console.info("[useInvoicesData] fetched", data?.invoices?.length || 0, "invoices");
      
      return { invoices: data?.invoices || [], count: data?.count || 0 };
    },
    staleTime: 5_000,
  });

  return {
    data: query.data?.invoices ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}