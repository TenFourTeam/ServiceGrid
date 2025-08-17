import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";

import type { Customer } from '@/types';

interface UseCustomersDataOptions {
  enabled?: boolean;
}

/**
 * Edge Function customers hook - unified authentication context
 */
export function useCustomersData(opts?: UseCustomersDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.customers(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useCustomersData] fetching customers via Edge Function...");
      
      const response = await edgeRequest(fn('customers'));
      
      console.info("[useCustomersData] fetched", response.customers.length, "customers");
      
      return {
        customers: response.customers as Customer[],
        count: response.count
      };
    },
    staleTime: 30_000,
  });

  return {
    data: query.data?.customers ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}