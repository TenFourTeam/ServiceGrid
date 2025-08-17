import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from "@/utils/authEdgeApi";

export interface Invoice {
  id: string;
  number: string;
  customerId: string;
  jobId?: string | null;
  subtotal: number;
  total: number;
  taxRate: number;
  discount: number;
  status: "Draft" | "Sent" | "Paid" | "Overdue";
  dueAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  publicToken?: string;
}

interface UseInvoicesDataOptions {
  enabled?: boolean;
}

/**
 * Edge Function invoices hook - unified Clerk authentication
 */
export function useInvoicesData(opts?: UseInvoicesDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.invoices(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useInvoicesData] fetching invoices via edge function");
      
      const { data, error } = await authApi.invoke('invoices-crud', {
        method: 'GET'
      });
      
      if (error) {
        console.error("[useInvoicesData] error:", error);
        throw new Error(error.message || 'Failed to fetch invoices');
      }
      
      console.info("[useInvoicesData] fetched", data?.invoices?.length || 0, "invoices");
      
      return { invoices: data?.invoices || [], count: data?.count || 0 };
    },
    staleTime: 30_000,
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