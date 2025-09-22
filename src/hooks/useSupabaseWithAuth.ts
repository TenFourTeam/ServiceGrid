import { useAuth } from '@clerk/clerk-react';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { useCallback } from 'react';

const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdWRrenFmcmlhemFiaW9zbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzIyNjAsImV4cCI6MjA3MDI0ODI2MH0.HLOwmgddlBTcHfYrX9RYvO8RK6IVkjDQvsdHyXuMXIM";

/**
 * Hook that provides a function to create Supabase client with Clerk authentication
 * This ensures RLS policies work with Clerk user tokens
 */
export function useSupabaseWithAuth() {
  const { getToken, isSignedIn } = useAuth();

  const createAuthenticatedClient = useCallback(async () => {
    let headers: Record<string, string> = {};
    
    if (isSignedIn) {
      try {
        const token = await getToken({ template: 'supabase' });
        console.log('Using Clerk token for RLS query:', !!token);
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
      } catch (error) {
        console.error('Failed to get Clerk token:', error);
      }
    }

    return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers
      }
    });
  }, [getToken, isSignedIn]);

  return { createAuthenticatedClient };
}