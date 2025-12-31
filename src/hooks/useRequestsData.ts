import { useQuery } from '@tanstack/react-query';
import { useBusinessContext } from './useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { queryKeys } from '@/queries/keys';

export interface RequestCustomer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export interface AssignedUser {
  id: string;
  email: string;
  display_name?: string;
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
  status: 'New' | 'Reviewed' | 'Scheduled' | 'Assessed' | 'Archived';
  notes?: string;
  photos: string[];
  created_at: string;
  updated_at: string;
  customer: RequestCustomer;
  assigned_to?: string | null;
  assigned_user?: AssignedUser | null;
}

export function useRequestsData() {
  const { isAuthenticated, businessId } = useBusinessContext();
  const authApi = useAuthApi();
  const enabled = isAuthenticated && !!businessId;

  return useQuery({
    queryKey: queryKeys.data.requests(businessId!),
    queryFn: async () => {
      console.info("[useRequestsData] fetching requests via edge function");
      
      const { data, error } = await authApi.invoke('requests-crud', {
        method: 'GET',
        headers: {
          'x-business-id': businessId
        }
      });

      if (error) {
        console.error("[useRequestsData] error:", error);
        throw new Error(error.message || 'Failed to fetch requests');
      }

      console.info("[useRequestsData] raw response:", data);
      console.info("[useRequestsData] data structure:", {
        hasData: !!data,
        hasDataProperty: !!(data?.data),
        dataLength: data?.length || 0,
        dataData: data?.data?.length || 0,
        isArray: Array.isArray(data),
        isDataArray: Array.isArray(data?.data)
      });

      // The backend returns requests directly, not wrapped in a data property
      const requests = Array.isArray(data) ? data : (data?.data || []);
      console.info("[useRequestsData] final requests:", requests);
      
      // Return structured data to match unified pattern
      return {
        data: requests as RequestListItem[],
        count: requests.length
      };
    },
    enabled,
    staleTime: 1000 * 30, // 30 seconds (same as quotes)
  });
}