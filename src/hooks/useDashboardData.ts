import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApiClient } from '@/auth';
import { useAuthSnapshot } from '@/auth';
import { useEffect } from 'react';

export interface DashboardData {
  business: {
    id: string;
    name: string;
    phone?: string;
    reply_to_email?: string;
    logo_url?: string;
    light_logo_url?: string;
    tax_rate_default: number;
    est_prefix: string;
    est_seq: number;
    inv_prefix: string;
    inv_seq: number;
  };
  counts: {
    customers: number;
    jobs: number;
    quotes: number;
  };
  customers: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
  }>;
  invoices: Array<{
    id: string;
    number: string;
    customerId: string;
    jobId?: string;
    taxRate: number;
    discount: number;
    subtotal: number;
    total: number;
    status: string;
    dueAt?: string;
    createdAt: string;
    updatedAt: string;
    publicToken: string;
  }>;
  stripeStatus: {
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    detailsSubmitted: boolean;
  };
  quotes: Array<{
    id: string;
    number: string;
    total: number;
    status: string;
    updated_at: string;
    view_count: number;
    public_token: string;
    customer_id: string;
    customers?: {
      name: string;
      email?: string;
    };
  }>;
  subscription: {
    subscribed: boolean;
    tier?: string;
    endDate?: string;
  };
}

export function useDashboardData() {
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const queryClient = useQueryClient();

  // Listen for business updates to refresh data
  useEffect(() => {
    const handleBusinessUpdate = () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    };

    window.addEventListener('business-updated', handleBusinessUpdate);
    return () => window.removeEventListener('business-updated', handleBusinessUpdate);
  }, [queryClient]);

  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: async (): Promise<DashboardData> => {
      const response = await apiClient.get("/dashboard-data");
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    enabled: snapshot.phase === 'authenticated',
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    retry: (failureCount, error) => {
      // Only retry network errors, not auth errors
      if (failureCount >= 3) return false;
      return !error?.message?.includes('401');
    }
  });
}