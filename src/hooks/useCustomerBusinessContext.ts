import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from './useCustomerAuth';
import type { CustomerBusiness } from '@/types/customerAuth';

interface BusinessContextResponse {
  businesses: CustomerBusiness[];
  active_business_id: string | null;
  active_customer_id: string | null;
}

export function useCustomerBusinessContext() {
  const { sessionToken, isAuthenticated } = useCustomerAuth();
  const queryClient = useQueryClient();

  // Fetch available businesses
  const { data, isLoading } = useQuery({
    queryKey: ['customer-businesses', sessionToken],
    queryFn: async (): Promise<BusinessContextResponse> => {
      if (!sessionToken) {
        throw new Error('No session token');
      }

      const { data, error } = await supabase.functions.invoke('customer-switch-business', {
        method: 'GET',
        headers: {
          'x-session-token': sessionToken,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch businesses');
      }

      return data as BusinessContextResponse;
    },
    enabled: isAuthenticated && !!sessionToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Switch business mutation
  const switchBusinessMutation = useMutation({
    mutationFn: async (businessId: string) => {
      if (!sessionToken) {
        throw new Error('No session token');
      }

      const { data, error } = await supabase.functions.invoke('customer-switch-business', {
        method: 'POST',
        headers: {
          'x-session-token': sessionToken,
        },
        body: { business_id: businessId },
      });

      if (error) {
        throw new Error(error.message || 'Failed to switch business');
      }

      return data;
    },
    onSuccess: (result) => {
      // Invalidate all customer-related queries to refetch with new business context
      queryClient.invalidateQueries({ queryKey: ['customer-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['customer-job-data'] });
      queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['customer-messages'] });
    },
  });

  return {
    businesses: data?.businesses || [],
    activeBusinessId: data?.active_business_id || null,
    activeCustomerId: data?.active_customer_id || null,
    isLoading,
    switchBusiness: switchBusinessMutation.mutateAsync,
    isSwitching: switchBusinessMutation.isPending,
  };
}
