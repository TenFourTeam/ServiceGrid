import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { supabase, setClerkToken } from '@/integrations/supabase/client';
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
    async function updateToken() {
      if (isSignedIn) {
        try {
          const token = await getToken({ template: 'supabase' });
          setClerkTokenState(token);
          
          // Set the token in the Supabase client for RLS
          setClerkToken(token);
        } catch (error) {
          console.error('Failed to get Clerk token:', error);
          setClerkTokenState(null);
          setClerkToken(null);
        }
      } else {
        setClerkTokenState(null);
        setClerkToken(null);
      }
    }

    updateToken();
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