import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

interface SupabaseAuthContextType {
  supabaseClient: SupabaseClient<Database>;
  isAuthenticated: boolean;
  clerkToken: string | null;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const { isSignedIn, getToken } = useAuth();
  const [clerkToken, setClerkToken] = useState<string | null>(null);

  useEffect(() => {
    async function updateToken() {
      if (isSignedIn) {
        try {
          const token = await getToken({ template: 'supabase' });
          setClerkToken(token);
          
          // Use Supabase's auth.setSession to set the Clerk token
          if (token) {
            await supabase.auth.setSession({
              access_token: token,
              refresh_token: token // Using same token for refresh
            });
          }
          
          console.log('Clerk token set for RLS:', !!token);
        } catch (error) {
          console.error('Failed to get Clerk token:', error);
          setClerkToken(null);
        }
      } else {
        setClerkToken(null);
        supabase.auth.signOut();
      }
    }

    updateToken();
  }, [isSignedIn, getToken]);

  return (
    <SupabaseAuthContext.Provider 
      value={{ 
        supabaseClient: supabase, 
        isAuthenticated: !!isSignedIn,
        clerkToken
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
}

export function useSupabaseAuth() {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
}