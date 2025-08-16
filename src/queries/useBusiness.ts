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
      
      // First get the user's profile to find their default business
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('default_business_id')
        .eq('clerk_user_id', userId!)
        .maybeSingle();
      
      if (profileError) {
        console.error('[useBusiness] profile error:', profileError);
        throw profileError;
      }
      
      if (!profile?.default_business_id) {
        console.warn('[useBusiness] no default business found');
        return null;
      }
      
      // Get the business details
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('id', profile.default_business_id)
        .single();
      
      if (businessError) {
        console.error('[useBusiness] business error:', businessError);
        throw businessError;
      }
      
      // Get the user's profile ID for membership lookup
      const { data: profileWithId, error: profileIdError } = await supabase
        .from('profiles')
        .select('id')
        .eq('clerk_user_id', userId!)
        .maybeSingle();
      
      // Get the user's role in this business
      const { data: membership, error: membershipError } = await supabase
        .from('business_members')
        .select('role')
        .eq('business_id', profile.default_business_id)
        .eq('user_id', profileWithId?.id)
        .maybeSingle();
      
      if (membershipError) {
        console.error('[useBusiness] membership error:', membershipError);
        // Default to owner role if membership lookup fails
      }
      
      const businessUI = toBusinessUI(business) as BusinessUI;
      businessUI.role = membership?.role || 'owner';
      return businessUI;
    },
    staleTime: 30_000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
