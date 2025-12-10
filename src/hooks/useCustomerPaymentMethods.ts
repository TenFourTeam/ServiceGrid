import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildEdgeFunctionUrl } from '@/utils/env';
import { toast } from 'sonner';

export interface SavedPaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export function useCustomerPaymentMethods() {
  const queryClient = useQueryClient();
  
  // Get session token from localStorage
  const getSessionToken = () => {
    return localStorage.getItem('customer_session_token');
  };

  const query = useQuery({
    queryKey: ['customer-payment-methods'],
    queryFn: async (): Promise<SavedPaymentMethod[]> => {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        return [];
      }

      const response = await fetch(
        buildEdgeFunctionUrl('payments-crud', { action: 'list_payment_methods' }),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-customer-session': sessionToken,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch payment methods');
      }

      const data = await response.json();
      return data.paymentMethods || [];
    },
    staleTime: 60_000, // 1 minute
    enabled: !!getSessionToken(),
  });

  const deletePaymentMethod = useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const sessionToken = getSessionToken();
      if (!sessionToken) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        buildEdgeFunctionUrl('payments-crud', { action: 'delete_payment_method' }),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-customer-session': sessionToken,
          },
          body: JSON.stringify({ payment_method_id: paymentMethodId }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete payment method');
      }

      return paymentMethodId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-payment-methods'] });
      toast.success('Payment method removed');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  return {
    paymentMethods: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    deletePaymentMethod,
  };
}
