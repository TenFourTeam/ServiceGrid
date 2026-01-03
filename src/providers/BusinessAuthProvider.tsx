import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

// Logging helper with timestamps
function authLog(category: string, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  console.log(`[${timestamp}] [BusinessAuth:${category}] ${message}`, data ? data : '');
}

// Types
export interface BusinessUser {
  profileId: string;
  email: string;
  fullName: string | null;
  phoneE164: string | null;
  defaultBusinessId: string | null;
}

export interface BusinessProfile {
  id: string;
  email: string;
  fullName: string | null;
  phoneE164: string | null;
  defaultBusinessId: string | null;
}

export interface BusinessAuthContextValue {
  // State
  user: BusinessUser | null;
  profile: BusinessProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  authTimedOut: boolean; // True if auth init timed out (stale tokens cleared)
  
  // Actions
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  sendMagicLink: (email: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  
  // Token access (for API calls) - now returns JWT from Supabase session
  getSessionToken: () => string | null;
}

const BusinessAuthContext = createContext<BusinessAuthContextValue | null>(null);

interface BusinessAuthProviderProps {
  children: React.ReactNode;
}

// Helper to clear all Supabase auth tokens from localStorage
function clearSupabaseAuthTokens(): void {
  if (typeof window === 'undefined') return;
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.includes('supabase') && key.includes('auth')
  );
  keysToRemove.forEach(key => {
    authLog('CLEANUP', `Removing localStorage key: ${key}`);
    localStorage.removeItem(key);
  });
  authLog('CLEANUP', 'Cleared auth tokens', { count: keysToRemove.length });
}

export function BusinessAuthProvider({ children }: BusinessAuthProviderProps) {
  const [user, setUser] = useState<BusinessUser | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authTimedOut, setAuthTimedOut] = useState(false);

  const isAuthenticated = !!session?.user;
  
  // Track last fetched profile to prevent duplicate fetches
  const lastFetchedProfileIdRef = useRef<string | null>(null);
  // Track whether initial auth state has been processed
  const hasInitializedRef = useRef(false);
  // Track processed initial events to prevent duplicates
  const hasProcessedInitialEventRef = useRef(false);

  // Fetch profile from database
  const fetchProfile = useCallback(async (authUser: User): Promise<void> => {
    // Skip if we already fetched for this user
    if (lastFetchedProfileIdRef.current === authUser.id) {
      authLog('FETCH', 'Skipping duplicate profile fetch', { userId: authUser.id });
      return;
    }
    
    authLog('FETCH', 'Fetching profile from database', { userId: authUser.id });
    
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone_e164, default_business_id')
        .eq('id', authUser.id)
        .single();

      if (error) {
        authLog('FETCH', 'Profile fetch error', { error: error.message });
        return;
      }

      if (profileData) {
        authLog('FETCH', 'Profile fetched successfully', { 
          profileId: profileData.id, 
          hasDefaultBusiness: !!profileData.default_business_id 
        });
        
        const userData: BusinessUser = {
          profileId: profileData.id,
          email: profileData.email,
          fullName: profileData.full_name,
          phoneE164: profileData.phone_e164,
          defaultBusinessId: profileData.default_business_id
        };

        const profileObj: BusinessProfile = {
          id: profileData.id,
          email: profileData.email,
          fullName: profileData.full_name,
          phoneE164: profileData.phone_e164,
          defaultBusinessId: profileData.default_business_id
        };

        setUser(userData);
        setProfile(profileObj);
        lastFetchedProfileIdRef.current = authUser.id;
      }
    } catch (err) {
      authLog('FETCH', 'Unexpected profile fetch error', { error: String(err) });
    }
  }, []);

  // Clear user state
  const clearUserState = useCallback(() => {
    authLog('STATE', 'Clearing all user state');
    setUser(null);
    setProfile(null);
    setSession(null);
    lastFetchedProfileIdRef.current = null;
    hasProcessedInitialEventRef.current = false;
  }, []);

  // Initialize auth state - FORCE LOGOUT ON EVERY PAGE LOAD
  useEffect(() => {
    authLog('INIT', 'Provider mounting - FORCING LOGOUT ON PAGE LOAD');
    
    // FORCE LOGOUT ON REFRESH: Clear all session data immediately
    clearSupabaseAuthTokens();
    
    // Sign out from Supabase client to ensure clean state
    supabase.auth.signOut().catch((err) => {
      authLog('INIT', 'SignOut during forced logout (expected)', { error: err?.message });
    });
    
    // Set initial state to unauthenticated
    setSession(null);
    setUser(null);
    setProfile(null);
    hasInitializedRef.current = true;
    setIsLoading(false);
    
    authLog('INIT', 'Forced logout complete - user must re-authenticate');
    
    // Set up auth state listener for future auth events (login, register, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        authLog('EVENT', 'Auth state changed', { 
          event, 
          hasSession: !!newSession,
          userId: newSession?.user?.id,
          alreadyProcessed: hasProcessedInitialEventRef.current
        });
        
        // CONSOLIDATION: Skip duplicate initial events during page load
        if ((event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && hasProcessedInitialEventRef.current) {
          authLog('EVENT', 'Skipping duplicate initial event', { event });
          return;
        }
        
        // Mark initial events as processed
        if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          hasProcessedInitialEventRef.current = true;
        }

        // Handle sign out
        if (event === 'SIGNED_OUT') {
          authLog('STATE', 'User signed out - clearing all state');
          clearUserState();
          return;
        }

        // Handle sign in
        if (event === 'SIGNED_IN' && newSession?.user) {
          authLog('STATE', 'User signed in', { userId: newSession.user.id });
          setSession(newSession);
          hasProcessedInitialEventRef.current = true;
          
          // Defer profile fetch to avoid Supabase deadlock
          setTimeout(() => {
            fetchProfile(newSession.user);
          }, 0);
        }
      }
    );

    return () => {
      authLog('INIT', 'Provider unmounting');
      subscription.unsubscribe();
    };
  }, [fetchProfile, clearUserState]);

  // Get session token (JWT) for API calls
  const getSessionToken = useCallback((): string | null => {
    return session?.access_token ?? null;
  }, [session]);

  // Refresh session
  const refreshSession = useCallback(async (): Promise<boolean> => {
    authLog('REFRESH', 'Session refresh requested');
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        authLog('REFRESH', 'Session refresh failed', { error: error?.message });
        return false;
      }
      authLog('REFRESH', 'Session refresh successful');
      return true;
    } catch (err) {
      authLog('REFRESH', 'Session refresh error', { error: String(err) });
      return false;
    }
  }, []);

  // Login with email/password
  const login = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    authLog('ACTION', 'Login attempt', { email });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      if (error) {
        authLog('ACTION', 'Login failed', { error: error.message });
        // Map Supabase error messages to user-friendly messages
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Invalid email or password' };
        }
        if (error.message.includes('Email not confirmed')) {
          return { error: 'Please verify your email before signing in' };
        }
        return { error: error.message };
      }

      if (!data.session) {
        authLog('ACTION', 'Login returned no session');
        return { error: 'Login failed. Please try again.' };
      }

      authLog('ACTION', 'Login successful', { userId: data.user?.id });
      return {};
    } catch (err: any) {
      authLog('ACTION', 'Login exception', { error: err.message });
      return { error: err.message || 'Login failed' };
    }
  }, []);

  // Register new user
  const register = useCallback(async (email: string, password: string, fullName: string): Promise<{ error?: string }> => {
    authLog('ACTION', 'Registration attempt', { email, hasFullName: !!fullName });
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim()
          }
        }
      });

      if (error) {
        authLog('ACTION', 'Registration failed', { error: error.message });
        // Map Supabase error messages to user-friendly messages
        if (error.message.includes('already registered')) {
          return { error: 'An account with this email already exists. Try logging in instead.' };
        }
        if (error.message.includes('Password should be at least')) {
          return { error: 'Password must be at least 6 characters' };
        }
        return { error: error.message };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        authLog('ACTION', 'Registration successful - email confirmation required');
        return { error: 'Please check your email to confirm your account.' };
      }

      if (!data.session) {
        authLog('ACTION', 'Registration returned no session');
        return { error: 'Registration failed. Please try again.' };
      }

      authLog('ACTION', 'Registration successful with session', { userId: data.user?.id });
      return {};
    } catch (err: any) {
      authLog('ACTION', 'Registration exception', { error: err.message });
      return { error: err.message || 'Registration failed' };
    }
  }, []);

  // Send magic link
  const sendMagicLink = useCallback(async (email: string): Promise<{ error?: string }> => {
    authLog('ACTION', 'Magic link request', { email });
    
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        authLog('ACTION', 'Magic link failed', { error: error.message });
        return { error: error.message };
      }

      authLog('ACTION', 'Magic link sent successfully');
      return {};
    } catch (err: any) {
      authLog('ACTION', 'Magic link exception', { error: err.message });
      return { error: err.message || 'Failed to send magic link' };
    }
  }, []);

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    authLog('LOGOUT', 'Logout initiated');
    
    // Clear localStorage tokens FIRST to prevent AuthBoundary race condition
    clearSupabaseAuthTokens();
    
    try {
      await supabase.auth.signOut();
    } catch (err) {
      authLog('LOGOUT', 'SignOut error (non-critical)', { error: String(err) });
    }
    
    clearUserState();
    authLog('LOGOUT', 'Logout complete');
  }, [clearUserState]);

  const value = useMemo<BusinessAuthContextValue>(() => ({
    user,
    profile,
    isLoading,
    isAuthenticated,
    session,
    authTimedOut,
    login,
    register,
    sendMagicLink,
    logout,
    refreshSession,
    getSessionToken
  }), [user, profile, isLoading, isAuthenticated, session, authTimedOut, login, register, sendMagicLink, logout, refreshSession, getSessionToken]);

  return (
    <BusinessAuthContext.Provider value={value}>
      {children}
    </BusinessAuthContext.Provider>
  );
}

export function useBusinessAuthContext() {
  const context = useContext(BusinessAuthContext);
  if (!context) {
    throw new Error('useBusinessAuthContext must be used within BusinessAuthProvider');
  }
  return context;
}
