import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from "@/utils/authEdgeApi";

import type { Customer } from '@/types';

interface UseCustomersDataOptions {
  enabled?: boolean;
}

/**
 * Edge Function customers hook - unified Clerk authentication
 */
export function useCustomersData(opts?: UseCustomersDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.customers(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useCustomersData] fetching customers via edge function");
      
      const { data, error } = await authApi.invoke('customers-crud', {
        method: 'GET'
      });
      
      if (error) {
        console.error("[useCustomersData] error:", error);
        throw new Error(error.message || 'Failed to fetch customers');
      }
      
      console.info("[useCustomersData] fetched", data?.customers?.length || 0, "customers");
      
      return {
        customers: data?.customers || [],
        count: data?.count || 0
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