import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";

import type { Customer } from '@/types';

interface UseCustomersDataOptions {
  enabled?: boolean;
}

/**
 * Direct Supabase customers hook - no Edge Function needed
 */
export function useCustomersData(opts?: UseCustomersDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.customers(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useCustomersData] fetching customers...");
      
      const { data, error, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('business_id', businessId!)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("[useCustomersData] error:", error);
        throw error;
      }
      
      const customers: Customer[] = (data || []).map((c: any) => ({
        id: c.id,
        businessId: c.business_id,
        name: c.name,
        email: c.email ?? undefined,
        phone: c.phone ?? undefined,
        address: c.address ?? undefined,
        notes: c.notes ?? undefined,
      }));
      
      console.info("[useCustomersData] fetched", customers.length, "customers");
      
      return { customers, count: count ?? customers.length };
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