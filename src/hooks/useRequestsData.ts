import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessContext } from './useBusinessContext';

export interface RequestCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface RequestListItem {
  id: string;
  business_id: string;
  owner_id: string;
  customer_id: string;
  title: string;
  property_address?: string;
  service_details: string;
  preferred_assessment_date?: string;
  alternative_date?: string;
  preferred_times: string[];
  status: 'New' | 'Reviewed' | 'Scheduled' | 'Completed' | 'Declined';
  notes?: string;
  created_at: string;
  updated_at: string;
  customer: RequestCustomer;
}

export function useRequestsData() {
  const { businessId, isLoadingBusiness } = useBusinessContext();

  return useQuery({
    queryKey: ['requests', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await supabase.functions.invoke('requests-crud', {
        method: 'GET'
      });

      if (error) {
        console.error('Error fetching requests:', error);
        throw new Error(error.message || 'Failed to fetch requests');
      }

      return (data?.data || []) as RequestListItem[];
    },
    enabled: !isLoadingBusiness && !!businessId,
    staleTime: 1000 * 60, // 1 minute
  });
}