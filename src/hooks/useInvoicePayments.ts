import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from "@/utils/authEdgeApi";

export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  method: string;
  receivedAt: string;
  createdAt: string;
  last4?: string;
}

interface UseInvoicePaymentsOptions {
  invoiceId?: string;
  enabled?: boolean;
}

/**
 * Fetch payments for a specific invoice
 */
export function useInvoicePayments({ invoiceId, enabled = true }: UseInvoicePaymentsOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryEnabled = isAuthenticated && !!businessId && !!invoiceId && enabled;

  const query = useQuery({
    queryKey: queryKeys.data.payments(invoiceId || ''),
    enabled: queryEnabled,
    queryFn: async () => {
      console.info("[useInvoicePayments] fetching payments for invoice:", invoiceId);
      
      const { data, error } = await authApi.invoke('invoices-crud', {
        method: 'GET',
        queryParams: { 
          action: 'get_payments',
          invoiceId 
        }
      });
      
      if (error) {
        console.error("[useInvoicePayments] error:", error);
        throw new Error(error.message || 'Failed to fetch invoice payments');
      }
      
      console.info("[useInvoicePayments] fetched", data?.payments?.length || 0, "payments");
      
      return data?.payments || [];
    },
    staleTime: 30_000,
  });

  return {
    data: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}