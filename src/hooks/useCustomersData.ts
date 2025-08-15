import { useQuery } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys } from "@/queries/keys";
import { z } from "zod";

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

const CustomersResponseSchema = z.object({
  rows: z.array(z.any()).optional().default([]),
  count: z.number().optional(),
});

interface UseCustomersDataOptions {
  enabled?: boolean;
  loadData?: boolean; // Controls whether to fetch full data or just count
}

/**
 * Unified customers hook that provides both count and data
 * Smart fetching: count first, then optionally full data
 */
export function useCustomersData(opts?: UseCustomersDataOptions) {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && (opts?.enabled ?? true);
  const loadData = opts?.loadData ?? true;

  // Count query - always fast and lightweight
  const countQuery = useQuery({
    queryKey: queryKeys.counts.customers(businessId || ''),
    enabled: enabled && !!businessId,
    queryFn: async (): Promise<number> => {
      console.info("[useCustomersData] fetching count...");
      const data = await edgeRequest(`${fn('customers')}?count=true`, {
        method: 'GET',
      });
      
      const count = data?.count ?? 0;
      console.info("[useCustomersData] count:", count);
      return count;
    },
    staleTime: 30_000,
  });

  // Full data query - only when needed
  const dataQuery = useQuery<Customer[]>({
    queryKey: queryKeys.data.customers(businessId || ''),
    enabled: enabled && !!businessId && loadData,
    queryFn: async () => {
      console.info("[useCustomersData] fetching full data...");
      const data = await edgeRequest(fn('customers'), {
        method: 'GET',
      });
      
      if (!data) {
        console.info("[useCustomersData] no data (null) – likely signed out");
        return [];
      }
      
      const parsed = CustomersResponseSchema.parse(data);
      const customers: Customer[] = (parsed.rows || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        email: c.email ?? null,
        phone: c.phone ?? null,
        address: c.address ?? null,
      }));
      
      console.info("[useCustomersData] fetched", customers.length, "customers");
      return customers;
    },
    staleTime: 30_000,
  });

  return {
    // Count data
    count: countQuery.data ?? 0,
    isLoadingCount: countQuery.isLoading,
    isErrorCount: countQuery.isError,
    errorCount: countQuery.error,
    
    // Full data
    data: dataQuery.data ?? [],
    isLoadingData: dataQuery.isLoading,
    isErrorData: dataQuery.isError,
    errorData: dataQuery.error,
    
    // Combined states
    isLoading: countQuery.isLoading || (loadData && dataQuery.isLoading),
    isError: countQuery.isError || (loadData && dataQuery.isError),
    error: countQuery.error || (loadData && dataQuery.error),
    
    // Control functions
    refetchCount: countQuery.refetch,
    refetchData: dataQuery.refetch,
    refetch: () => {
      countQuery.refetch();
      if (loadData) dataQuery.refetch();
    },
  };
}