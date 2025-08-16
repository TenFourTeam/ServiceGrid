import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from './keys';
import { toProfileUI } from './transform';
import { useAuth } from '@clerk/clerk-react';

export function useProfile() {
  const { userId } = useAuth();

  return useQuery({
    queryKey: queryKeys.profile.current(),
    enabled: !!userId,
    queryFn: async () => {
      console.info('[useProfile] fetching profile from database');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone_e164, default_business_id')
        .eq('clerk_user_id', userId!)
        .maybeSingle();
      
      if (error) {
        console.error('[useProfile] error:', error);
        throw error;
      }
      
      if (!data) {
        console.warn('[useProfile] profile not found');
        return null;
      }
      
      return toProfileUI(data);
    },
    staleTime: 30_000,
    retry: 2,
  });
}