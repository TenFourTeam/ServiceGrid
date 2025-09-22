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
  const [clerkTokenState, setClerkTokenState] = useState<string | null>(null);

  useEffect(() => {
    async function updateSupabaseSession() {
      console.log('updateSupabaseSession called - isSignedIn:', isSignedIn);
      
      if (isSignedIn) {
        try {
          const token = await getToken({ template: 'supabase' });
          console.log('Got Clerk token:', !!token, token?.substring(0, 50) + '...');
          setClerkTokenState(token);
          
          if (token) {
            // Set Supabase session using Clerk token
            console.log('Setting Supabase session with Clerk token');
            const { data, error } = await supabase.auth.setSession({
              access_token: token,
              refresh_token: 'dummy-refresh-token' // Required but not used with Clerk
            });
            
            if (error) {
              console.error('Error setting Supabase session:', error);
            } else {
              console.log('Successfully set Supabase session:', !!data.session);
            }
          }
        } catch (error) {
          console.error('Failed to set Supabase session with Clerk token:', error);
          setClerkTokenState(null);
          await supabase.auth.signOut();
        }
      } else {
        setClerkTokenState(null);
        console.log('User signed out, clearing Supabase session');
        await supabase.auth.signOut();
      }
    }

    updateSupabaseSession();
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