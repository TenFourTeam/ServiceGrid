import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { supabase, setClerkTokenGetter } from '@/integrations/supabase/client';
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
  const [clerkTokenState, setClerkTokenState] = useState<string | null>(null);

  useEffect(() => {
    async function setupClerkIntegration() {
      console.log('Setting up Clerk integration - isSignedIn:', isSignedIn);
      
      // Set up the token getter function for Supabase client
      const tokenGetter = async () => {
        if (!isSignedIn) return null;
        try {
          const token = await getToken({ template: 'supabase' });
          console.log('Clerk token getter called - got token:', !!token);
          return token;
        } catch (error) {
          console.error('Failed to get Clerk token:', error);
          return null;
        }
      };

      setClerkTokenGetter(tokenGetter);
      
      if (isSignedIn) {
        try {
          const token = await getToken({ template: 'supabase' });
          console.log('Got Clerk token for state:', !!token, token?.substring(0, 50) + '...');
          setClerkTokenState(token);
        } catch (error) {
          console.error('Failed to get Clerk token for state:', error);
          setClerkTokenState(null);
        }
      } else {
        setClerkTokenState(null);
        console.log('User signed out, clearing token state');
      }
    }

    setupClerkIntegration();
  }, [isSignedIn, getToken]);

  return (
    <SupabaseAuthContext.Provider 
      value={{ 
        supabaseClient: supabase, 
        isAuthenticated: !!isSignedIn,
        clerkToken: clerkTokenState
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