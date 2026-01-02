import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { setBootStage } from '@/lib/boot-trace';

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

export function BusinessAuthProvider({ children }: BusinessAuthProviderProps) {
  const [user, setUser] = useState<BusinessUser | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!session?.user;

  // Fetch profile from database
  const fetchProfile = useCallback(async (authUser: User): Promise<void> => {
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone_e164, default_business_id')
        .eq('id', authUser.id)
        .single();

      if (error) {
        console.error('[BusinessAuth] Failed to fetch profile:', error);
        return;
      }

      if (profileData) {
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
      }
    } catch (err) {
      console.error('[BusinessAuth] Profile fetch error:', err);
    }
  }, []);

  // Clear user state
  const clearUserState = useCallback(() => {
    setUser(null);
    setProfile(null);
    setSession(null);
  }, []);

  // Track whether initial auth state has been processed (prevents multiple setIsLoading calls)
  const hasInitializedRef = useRef(false);

  // Initialize auth state listener - runs ONCE on mount
  useEffect(() => {
    let isMounted = true;
    const AUTH_INIT_TIMEOUT_MS = 6000; // Failsafe: force init after 6 seconds

    setBootStage('auth_checking');

    // Failsafe timeout - ensures isLoading ALWAYS resolves even if getSession hangs
    const timeoutId = setTimeout(() => {
      if (!hasInitializedRef.current && isMounted) {
        console.warn('[BusinessAuth] Init timeout reached, forcing isLoading=false');
        setBootStage('error', 'Auth initialization timeout');
        hasInitializedRef.current = true;
        setIsLoading(false);
      }
    }, AUTH_INIT_TIMEOUT_MS);

    // Set up auth state listener FIRST (purely reactive after initialization)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('[BusinessAuth] Auth state changed:', event, 'hasSession:', !!newSession);
        
        // Clear state on explicit sign-out
        if (event === 'SIGNED_OUT') {
          console.log('[BusinessAuth] Explicit sign-out, clearing state');
          clearUserState();
          return;
        }

        // Update session state
        setSession(newSession);
        
        if (newSession?.user) {
          // Defer profile fetch to avoid Supabase deadlock
          setTimeout(() => {
            if (isMounted) {
              fetchProfile(newSession.user);
            }
          }, 0);
        }
        // Note: We do NOT call clearUserState() on null sessions here
        // This prevents clearing state during initialization or token refresh
      }
    );

    // Async IIFE with try/catch/finally to GUARANTEE isLoading resolves
    (async () => {
      try {
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.error('[BusinessAuth] getSession error:', error.message);
          
          // Detect stale/invalid refresh token and clear it immediately
          if (error.message?.includes('Refresh Token') || error.message?.includes('refresh_token')) {
            console.warn('[BusinessAuth] Stale refresh token detected, signing out to clear');
            await supabase.auth.signOut();
          }
          // Treat as no session - don't throw
        }
        
        console.log('[BusinessAuth] Initial session check:', !!existingSession);
        setSession(existingSession ?? null);
        
        if (existingSession?.user) {
          fetchProfile(existingSession.user);
        }
      } catch (err) {
        console.error('[BusinessAuth] Unexpected init error:', err);
        // Still continue - we'll just have no session
      } finally {
        // ALWAYS mark initialization complete
        if (!hasInitializedRef.current && isMounted) {
          hasInitializedRef.current = true;
          setIsLoading(false);
          setBootStage('auth_loaded');
          console.log('[BusinessAuth] Initialization complete, isLoading=false');
        }
      }
    })();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchProfile, clearUserState]);

  // Get session token (JWT) for API calls
  const getSessionToken = useCallback((): string | null => {
    return session?.access_token ?? null;
  }, [session]);

  // Refresh session
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        console.warn('[BusinessAuth] Session refresh failed:', error?.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[BusinessAuth] Session refresh error:', err);
      return false;
    }
  }, []);

  // Login with email/password
  const login = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      if (error) {
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
        return { error: 'Login failed. Please try again.' };
      }

      return {};
    } catch (err: any) {
      console.error('[BusinessAuth] Login error:', err);
      return { error: err.message || 'Login failed' };
    }
  }, []);

  // Register new user
  const register = useCallback(async (email: string, password: string, fullName: string): Promise<{ error?: string }> => {
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
        // Email confirmation is required
        return { error: 'Please check your email to confirm your account.' };
      }

      if (!data.session) {
        return { error: 'Registration failed. Please try again.' };
      }

      return {};
    } catch (err: any) {
      console.error('[BusinessAuth] Register error:', err);
      return { error: err.message || 'Registration failed' };
    }
  }, []);

  // Send magic link
  const sendMagicLink = useCallback(async (email: string): Promise<{ error?: string }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: redirectUrl
        }
      });

      if (error) {
        return { error: error.message };
      }

      return {};
    } catch (err: any) {
      console.error('[BusinessAuth] Magic link error:', err);
      return { error: err.message || 'Failed to send magic link' };
    }
  }, []);

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[BusinessAuth] Logout error:', err);
    }
    clearUserState();
  }, [clearUserState]);

  const value = useMemo<BusinessAuthContextValue>(() => ({
    user,
    profile,
    isLoading,
    isAuthenticated,
    session,
    login,
    register,
    sendMagicLink,
    logout,
    refreshSession,
    getSessionToken
  }), [user, profile, isLoading, isAuthenticated, session, login, register, sendMagicLink, logout, refreshSession, getSessionToken]);

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
