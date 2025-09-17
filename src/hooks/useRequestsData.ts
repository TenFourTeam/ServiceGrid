import { useQuery } from '@tanstack/react-query';
import { useBusinessContext } from './useBusinessContext';
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';

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
  const { isAuthenticated, businessId } = useBusinessContext();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const enabled = isAuthenticated && !!businessId;

  return useQuery({
    queryKey: ['requests', businessId],
    queryFn: async () => {
      console.info("[useRequestsData] fetching requests via edge function");
      
      const { data, error } = await authApi.invoke('requests-crud', {
        method: 'GET'
      });

      if (error) {
        console.error("[useRequestsData] error:", error);
        throw new Error(error.message || 'Failed to fetch requests');
      }

      console.info("[useRequestsData] fetched", data?.data?.length || 0, "requests");
      return (data?.data || []) as RequestListItem[];
    },
    enabled,
    staleTime: 1000 * 60, // 1 minute
  });
}