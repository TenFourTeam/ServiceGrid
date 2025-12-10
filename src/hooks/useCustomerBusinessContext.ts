import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from './useCustomerAuth';
import type { CustomerBusiness } from '@/types/customerAuth';

interface BusinessContextResponse {
  businesses: CustomerBusiness[];
  active_business_id: string | null;
  active_customer_id: string | null;
}

export function useCustomerBusinessContext() {
  const { sessionToken, isAuthenticated, refreshSession } = useCustomerAuth();
  const queryClient = useQueryClient();
  const hasInitialized = useRef(false);

  // Fetch available businesses
  const { data, isLoading, refetch } = useQuery({
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
    onSuccess: () => {
      // Invalidate all customer-related queries to refetch with new business context
      queryClient.invalidateQueries({ queryKey: ['customer-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['customer-job-data'] });
      queryClient.invalidateQueries({ queryKey: ['customer-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['customer-messages'] });
      // Also refresh auth state to get updated context
      refreshSession();
    },
  });

  // Auto-initialize context if missing
  const ensureActiveContext = useCallback(async () => {
    if (!sessionToken || !data) return;
    
    const hasNoActiveContext = !data.active_business_id && !data.active_customer_id;
    const hasBusinesses = data.businesses && data.businesses.length > 0;
    
    if (hasNoActiveContext && hasBusinesses && !hasInitialized.current) {
      hasInitialized.current = true;
      console.log('[useCustomerBusinessContext] No active context, auto-initializing with first business');
      try {
        await switchBusinessMutation.mutateAsync(data.businesses[0].id);
      } catch (error) {
        console.error('[useCustomerBusinessContext] Failed to auto-initialize context:', error);
        hasInitialized.current = false;
      }
    }
  }, [sessionToken, data, switchBusinessMutation]);

  // Auto-initialize on mount when context is missing
  useEffect(() => {
    if (!isLoading && isAuthenticated && data) {
      ensureActiveContext();
    }
  }, [isLoading, isAuthenticated, data, ensureActiveContext]);

  // Get active business details
  const activeBusiness = data?.businesses?.find(b => b.id === data?.active_business_id) || null;

  return {
    businesses: data?.businesses || [],
    activeBusinessId: data?.active_business_id || null,
    activeCustomerId: data?.active_customer_id || null,
    activeBusiness,
    isLoading,
    switchBusiness: switchBusinessMutation.mutateAsync,
    isSwitching: switchBusinessMutation.isPending,
    ensureActiveContext,
    refetch,
  };
}
