import { useQuery } from '@tanstack/react-query';
import { buildEdgeFunctionUrl } from '@/utils/env';

export function useStripePublishableKey() {
  return useQuery({
    queryKey: ['stripe', 'publishable-key'],
    queryFn: async () => {
      const response = await fetch(buildEdgeFunctionUrl('stripe-config'));
      
      if (!response.ok) {
        throw new Error('Failed to fetch Stripe configuration');
      }
      
      const data = await response.json();
      return data.publishableKey as string;
    },
    staleTime: Infinity, // Key never changes during session
    retry: 2,
  });
}
