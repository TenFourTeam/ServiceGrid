import { useQuery } from "@tanstack/react-query";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";

import type { Customer } from '@/types';

interface UseCustomersDataOptions {
  enabled?: boolean;
}

/**
 * Simplified customers hook - single query for both count and data
 */
export function useCustomersData(opts?: UseCustomersDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.customers(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useCustomersData] fetching customers...");
      const data = await edgeRequest(fn('customers'), {
        method: 'GET',
      });
      
      if (!data) {
        console.info("[useCustomersData] no data - likely signed out");
        return { customers: [], count: 0 };
      }
      
      const customers: Customer[] = (data.rows || []).map((c: any) => ({
        id: c.id,
        businessId: c.businessId,
        name: c.name,
        email: c.email ?? undefined,
        phone: c.phone ?? undefined,
        address: c.address ?? undefined,
        notes: c.notes ?? undefined,
      }));
      
      const count = data.count ?? customers.length;
      console.info("[useCustomersData] fetched", customers.length, "customers");
      
      return { customers, count };
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