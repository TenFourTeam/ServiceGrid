import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { supabase } from "@/integrations/supabase/client";

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
      console.info("[useCustomersData] fetching customers via Supabase...");
      
      const { data, error, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("[useCustomersData] error:", error);
        throw error;
      }
      
      console.info("[useCustomersData] fetched", data?.length || 0, "customers");
      
      // Transform DB data to match Customer type
      const customers = data?.map(customer => ({
        id: customer.id,
        businessId: customer.business_id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        notes: customer.notes,
      })) || [];
      
      return {
        customers: customers as Customer[],
        count: count || 0
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