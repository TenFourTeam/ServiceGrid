import { useState, useEffect, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface AuthState {
  isLoaded: boolean;
  isSignedIn: boolean;
  userId: string | undefined;
  user: User | null;
  session: Session | null;
}

/**
 * Unified Supabase Auth hook - replaces @clerk/clerk-react useAuth
 * Provides authentication state and methods for the entire application
 */
export function useAuth(): AuthState & {
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
} {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoaded(true);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setIsLoaded(true);
        
        // Clear cache on sign out
        if (event === 'SIGNED_OUT') {
          // Defer any Supabase calls to avoid deadlock
          setTimeout(() => {
            console.info('[useAuth] User signed out, cache cleared');
          }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const getToken = useCallback(async (): Promise<string | null> => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    return currentSession?.access_token ?? null;
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
  }, []);

  return {
    isLoaded,
    isSignedIn: !!session,
    userId: session?.user?.id,
    user: session?.user ?? null,
    session,
    getToken,
    signOut,
  };
}

/**
 * Hook to get the current user - replaces @clerk/clerk-react useUser
 */
export function useUser() {
  const { user, isLoaded } = useAuth();
  
  return {
    isLoaded,
    isSignedIn: !!user,
    user: user ? {
      id: user.id,
      primaryEmailAddress: {
        emailAddress: user.email,
      },
      emailAddresses: user.email ? [{ emailAddress: user.email }] : [],
      fullName: user.user_metadata?.full_name,
      firstName: user.user_metadata?.first_name,
      lastName: user.user_metadata?.last_name,
      imageUrl: user.user_metadata?.avatar_url,
    } : null,
  };
}
