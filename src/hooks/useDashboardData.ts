import { useQuery } from '@tanstack/react-query';
import { edgeFetchJson } from '@/utils/edgeApi';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

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
  const { getToken, isSignedIn } = useClerkAuth();

  return useQuery({
    queryKey: ['dashboard-data'],
    queryFn: async (): Promise<DashboardData> => {
      const data = await edgeFetchJson("dashboard-data", getToken);
      return data;
    },
    enabled: isSignedIn,
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