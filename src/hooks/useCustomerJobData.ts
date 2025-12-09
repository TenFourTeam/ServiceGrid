import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCustomerAuth } from './useCustomerAuth';
import type { CustomerJobData } from '@/types/customerPortal';

export function useCustomerJobData() {
  const { sessionToken, isAuthenticated } = useCustomerAuth();

  return useQuery({
    queryKey: ['customer-job-data', sessionToken],
    queryFn: async (): Promise<CustomerJobData> => {
      if (!sessionToken) {
        throw new Error('No session token');
      }

      const { data, error } = await supabase.functions.invoke('customer-job-data', {
        headers: {
          'x-session-token': sessionToken,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch job data');
      }

      return data as CustomerJobData;
    },
    enabled: isAuthenticated && !!sessionToken,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
