import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';

interface ReferralStats {
  total_clicks: number;
  total_signups: number;
  referrals: Array<{
    id: string;
    referred_email: string | null;
    status: string;
    created_at: string;
    completed_at: string | null;
  }>;
}

export function useReferralStats() {
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['referral-stats'],
    queryFn: async () => {
      const { data, error } = await authApi.invoke('get-referral-stats', {
        method: 'GET'
      });

      if (error) {
        throw new Error(error.message || 'Failed to fetch referral stats');
      }

      return data as ReferralStats;
    }
  });
}
