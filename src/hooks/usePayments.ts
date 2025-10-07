import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { queryKeys } from "@/queries/keys";
import { useAuthApi } from "@/hooks/useAuthApi";
import type { Payment } from "@/hooks/useInvoicePayments";

export function usePayments(invoiceId?: string) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const paymentsQuery = useQuery({
    queryKey: queryKeys.data.payments(invoiceId || ''),
    enabled: isAuthenticated && !!businessId && !!invoiceId,
    queryFn: async () => {
      const { data, error } = await authApi.invoke('payments-crud', {
        method: 'GET',
        queryParams: { invoiceId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch payments');
      }

      return data?.payments || [];
    },
    staleTime: 30_000,
  });

  const createCheckout = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await authApi.invoke('payments-crud', {
        method: 'POST',
        body: { action: 'create_checkout', invoiceId }
      });

      if (error) {
        throw new Error(error.message || 'Failed to create checkout');
      }

      return data.url as string;
    },
  });

  const recordPayment = useMutation({
    mutationFn: async (params: {
      invoiceId: string;
      amount: number;
      method: string;
      receivedAt?: string;
      last4?: string;
    }) => {
      const { data, error } = await authApi.invoke('payments-crud', {
        method: 'POST',
        body: { action: 'record_payment', ...params }
      });

      if (error) {
        throw new Error(error.message || 'Failed to record payment');
      }

      return data.payment;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.data.payments(variables.invoiceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.data.invoices(businessId || '') });
    },
  });

  return {
    data: paymentsQuery.data ?? [],
    isLoading: paymentsQuery.isLoading,
    isError: paymentsQuery.isError,
    error: paymentsQuery.error,
    refetch: paymentsQuery.refetch,
    createCheckout,
    recordPayment,
  };
}
