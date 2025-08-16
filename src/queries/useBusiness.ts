import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from './keys';
import { toBusinessUI } from './transform';
import type { BusinessUI } from '@/hooks/useBusinessContext';

/**
 * Direct Supabase business query hook - no Edge Function needed
 */
export function useBusiness(enabled: boolean = true) {
  const { userId } = useAuth();
  
  return useQuery({
    queryKey: queryKeys.business.current(),
    enabled: enabled && !!userId,
    queryFn: async () => {
      console.info('[useBusiness] fetching business from database');
      
      // Single optimized query with joins
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          default_business_id,
          id,
          businesses!profiles_default_business_id_fkey (
            id,
            name,
            phone,
            reply_to_email,
            tax_rate_default,
            logo_url,
            light_logo_url,
            created_at,
            updated_at
          ),
          business_members!business_members_user_id_fkey (
            role,
            business_id
          )
        `)
        .eq('clerk_user_id', userId!)
        .maybeSingle();
      
      if (error) {
        console.error('[useBusiness] query error:', error);
        throw error;
      }
      
      if (!data?.default_business_id || !data.businesses) {
        console.warn('[useBusiness] no default business found');
        return null;
      }
      
      // Find the membership for the default business
      const membership = data.business_members?.find(
        (member: any) => member.business_id === data.default_business_id
      );
      
      const businessUI = toBusinessUI(data.businesses) as BusinessUI;
      businessUI.role = membership?.role || 'owner';
      return businessUI;
    },
    staleTime: 30_000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
