import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdWRrenFmcmlhemFiaW9zbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzIyNjAsImV4cCI6MjA3MDI0ODI2MH0.HLOwmgddlBTcHfYrX9RYvO8RK6IVkjDQvsdHyXuMXIM";

/**
 * Creates a Supabase client that uses Clerk JWT tokens for authentication
 * This enables RLS policies to work with Clerk users
 */
export function createClerkSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: false, // Clerk handles session persistence
      autoRefreshToken: false, // Clerk handles token refresh
    },
    global: {
      // Add Clerk JWT to all requests
      headers: {
        'x-custom-auth': 'clerk'
      }
    },
    // Use custom access token for authentication
    realtime: {
      params: {
        apikey: SUPABASE_PUBLISHABLE_KEY
      }
    }
  });
}

// Default client for non-authenticated requests
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});