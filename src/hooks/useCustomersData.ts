import { useQuery } from "@tanstack/react-query";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys } from "@/queries/keys";
import { useBusinessId } from "@/hooks/useBusinessId";
import { useAuth } from "@clerk/clerk-react";

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

interface UseCustomersDataOptions {
  enabled?: boolean;
}

/**
 * Simplified customers hook - single query for both count and data
 */
export function useCustomersData(opts?: UseCustomersDataOptions) {
  const { isSignedIn } = useAuth();
  const businessId = useBusinessId();
  const enabled = isSignedIn && !!businessId && (opts?.enabled ?? true);

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
        name: c.name,
        email: c.email ?? null,
        phone: c.phone ?? null,
        address: c.address ?? null,
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