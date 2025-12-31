import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';

/**
 * Hook for predictive prefetching on hover
 * Prefetches data before user clicks for instant-feeling interactions
 */
export function usePrefetch() {
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();
  
  /**
   * Prefetch customer details on hover
   */
  const prefetchCustomer = useCallback((customerId: string) => {
    if (!customerId) return;
    
    queryClient.prefetchQuery({
      queryKey: ['customer', customerId],
      queryFn: async () => {
        const { data, error } = await authApi.invoke(`customers-crud/${customerId}`, {
          method: 'GET',
        });
        if (error) throw error;
        return data;
      },
      staleTime: 30_000, // Consider fresh for 30s
    });
  }, [queryClient, authApi]);
  
  /**
   * Prefetch team members for assignment dropdowns
   */
  const prefetchTeamMembers = useCallback(() => {
    if (!businessId) return;
    
    queryClient.prefetchQuery({
      queryKey: ['team-members', businessId],
      queryFn: async () => {
        const { data, error } = await authApi.invoke('team-members', {
          method: 'GET',
        });
        if (error) throw error;
        return data;
      },
      staleTime: 60_000, // Consider fresh for 1 minute
    });
  }, [queryClient, businessId, authApi]);
  
  /**
   * Prefetch lead sources for forms
   */
  const prefetchLeadSources = useCallback(() => {
    // Lead sources are static, just ensure they're loaded
    queryClient.prefetchQuery({
      queryKey: ['lead-sources'],
      queryFn: () => Promise.resolve([
        'website', 'referral', 'google', 'facebook', 'instagram', 
        'yelp', 'homeadvisor', 'angies_list', 'thumbtack', 'nextdoor',
        'flyer', 'yard_sign', 'vehicle', 'cold_call', 'email', 'other'
      ]),
      staleTime: Infinity,
    });
  }, [queryClient]);
  
  /**
   * Prefetch requests for a customer
   */
  const prefetchCustomerRequests = useCallback((customerId: string) => {
    if (!customerId || !businessId) return;
    
    queryClient.prefetchQuery({
      queryKey: ['customer-requests', customerId],
      queryFn: async () => {
        const { data, error } = await authApi.invoke('requests-crud', {
          method: 'GET',
          queryParams: { customer_id: customerId },
        });
        if (error) throw error;
        return data;
      },
      staleTime: 30_000,
    });
  }, [queryClient, authApi, businessId]);
  
  /**
   * Prefetch data needed for new customer modal
   */
  const prefetchNewCustomerModal = useCallback(() => {
    prefetchLeadSources();
    prefetchTeamMembers();
  }, [prefetchLeadSources, prefetchTeamMembers]);
  
  /**
   * Prefetch all data for customer view modal
   */
  const prefetchCustomerViewModal = useCallback((customerId: string) => {
    prefetchCustomer(customerId);
    prefetchCustomerRequests(customerId);
  }, [prefetchCustomer, prefetchCustomerRequests]);
  
  return {
    prefetchCustomer,
    prefetchTeamMembers,
    prefetchLeadSources,
    prefetchCustomerRequests,
    prefetchNewCustomerModal,
    prefetchCustomerViewModal,
  };
}
