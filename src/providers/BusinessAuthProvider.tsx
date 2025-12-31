import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  
  // Actions
  login: (email: string, password: string) => Promise<{ error?: string }>;
  register: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  sendMagicLink: (email: string) => Promise<{ error?: string }>;
  verifyMagicLink: (token: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  
  // Token access (for API calls)
  getSessionToken: () => string | null;
}

const BusinessAuthContext = createContext<BusinessAuthContextValue | null>(null);

const SESSION_TOKEN_KEY = 'business_session_token';
const SESSION_EXPIRY_KEY = 'business_session_expiry';

interface BusinessAuthProviderProps {
  children: React.ReactNode;
}

export function BusinessAuthProvider({ children }: BusinessAuthProviderProps) {
  const [user, setUser] = useState<BusinessUser | null>(null);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const initRef = useRef(false);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get session token from storage
  const getSessionToken = useCallback((): string | null => {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  }, []);

  // Store session in localStorage
  const storeSession = useCallback((token: string, expiresAt: string) => {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
    localStorage.setItem(SESSION_EXPIRY_KEY, expiresAt);
  }, []);

  // Clear session from localStorage
  const clearSession = useCallback(() => {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(SESSION_EXPIRY_KEY);
    setUser(null);
    setProfile(null);
    setIsAuthenticated(false);
  }, []);

  // Validate session with backend
  const validateSession = useCallback(async (token: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('business-auth', {
        method: 'POST',
        body: { action: 'session' },
        headers: { 'x-session-token': token }
      });

      if (error || !data?.valid) {
        console.warn('[BusinessAuth] Session invalid:', error?.message || 'Invalid session');
        return false;
      }

      // Update user state from session data
      const userData: BusinessUser = {
        profileId: data.profile.id,
        email: data.profile.email,
        fullName: data.profile.full_name,
        phoneE164: data.profile.phone_e164,
        defaultBusinessId: data.profile.default_business_id
      };

      const profileData: BusinessProfile = {
        id: data.profile.id,
        email: data.profile.email,
        fullName: data.profile.full_name,
        phoneE164: data.profile.phone_e164,
        defaultBusinessId: data.profile.default_business_id
      };

      setUser(userData);
      setProfile(profileData);
      setIsAuthenticated(true);

      return true;
    } catch (err) {
      console.error('[BusinessAuth] Session validation error:', err);
      return false;
    }
  }, []);

  // Refresh session before expiry
  const refreshSession = useCallback(async (): Promise<boolean> => {
    const token = getSessionToken();
    if (!token) return false;

    try {
      const { data, error } = await supabase.functions.invoke('business-auth', {
        method: 'POST',
        body: { action: 'refresh' },
        headers: { 'x-session-token': token }
      });

      if (error || !data?.session_token) {
        console.warn('[BusinessAuth] Session refresh failed');
        clearSession();
        return false;
      }

      storeSession(data.session_token, data.expires_at);
      return true;
    } catch (err) {
      console.error('[BusinessAuth] Session refresh error:', err);
      clearSession();
      return false;
    }
  }, [getSessionToken, storeSession, clearSession]);

  // Initialize: check for existing session
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      const token = getSessionToken();
      
      if (token) {
        const valid = await validateSession(token);
        if (!valid) {
          clearSession();
        }
      }
      
      setIsLoading(false);
    };

    init();
  }, [getSessionToken, validateSession, clearSession]);

  // Set up session refresh interval (every 10 minutes)
  useEffect(() => {
    if (!isAuthenticated) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    refreshIntervalRef.current = setInterval(() => {
      refreshSession();
    }, 10 * 60 * 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [isAuthenticated, refreshSession]);

  // Login with email/password
  const login = useCallback(async (email: string, password: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('business-auth', {
        method: 'POST',
        body: { action: 'login', email, password }
      });

      if (error) {
        return { error: error.message || 'Login failed' };
      }

      if (!data?.session_token) {
        return { error: data?.error || 'Login failed' };
      }

      storeSession(data.session_token, data.expires_at);

      const userData: BusinessUser = {
        profileId: data.profile.id,
        email: data.profile.email,
        fullName: data.profile.full_name,
        phoneE164: data.profile.phone_e164,
        defaultBusinessId: data.profile.default_business_id
      };

      const profileData: BusinessProfile = {
        id: data.profile.id,
        email: data.profile.email,
        fullName: data.profile.full_name,
        phoneE164: data.profile.phone_e164,
        defaultBusinessId: data.profile.default_business_id
      };

      setUser(userData);
      setProfile(profileData);
      setIsAuthenticated(true);

      return {};
    } catch (err: any) {
      return { error: err.message || 'Login failed' };
    }
  }, [storeSession]);

  // Register new user
  const register = useCallback(async (email: string, password: string, fullName: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('business-auth', {
        method: 'POST',
        body: { action: 'register', email, password, full_name: fullName }
      });

      if (error) {
        return { error: error.message || 'Registration failed' };
      }

      if (!data?.session_token) {
        return { error: data?.error || 'Registration failed' };
      }

      storeSession(data.session_token, data.expires_at);

      const userData: BusinessUser = {
        profileId: data.profile.id,
        email: data.profile.email,
        fullName: data.profile.full_name,
        phoneE164: data.profile.phone_e164,
        defaultBusinessId: data.profile.default_business_id
      };

      const profileData: BusinessProfile = {
        id: data.profile.id,
        email: data.profile.email,
        fullName: data.profile.full_name,
        phoneE164: data.profile.phone_e164,
        defaultBusinessId: data.profile.default_business_id
      };

      setUser(userData);
      setProfile(profileData);
      setIsAuthenticated(true);

      return {};
    } catch (err: any) {
      return { error: err.message || 'Registration failed' };
    }
  }, [storeSession]);

  // Send magic link
  const sendMagicLink = useCallback(async (email: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('business-auth', {
        method: 'POST',
        body: { action: 'magic-link', email }
      });

      if (error) {
        return { error: error.message || 'Failed to send magic link' };
      }

      if (!data?.success) {
        return { error: data?.error || 'Failed to send magic link' };
      }

      return {};
    } catch (err: any) {
      return { error: err.message || 'Failed to send magic link' };
    }
  }, []);

  // Verify magic link
  const verifyMagicLink = useCallback(async (token: string): Promise<{ error?: string }> => {
    try {
      const { data, error } = await supabase.functions.invoke('business-auth', {
        method: 'POST',
        body: { action: 'verify-magic', token }
      });

      if (error) {
        return { error: error.message || 'Invalid or expired link' };
      }

      if (!data?.session_token) {
        return { error: data?.error || 'Invalid or expired link' };
      }

      storeSession(data.session_token, data.expires_at);

      const userData: BusinessUser = {
        profileId: data.profile.id,
        email: data.profile.email,
        fullName: data.profile.full_name,
        phoneE164: data.profile.phone_e164,
        defaultBusinessId: data.profile.default_business_id
      };

      const profileData: BusinessProfile = {
        id: data.profile.id,
        email: data.profile.email,
        fullName: data.profile.full_name,
        phoneE164: data.profile.phone_e164,
        defaultBusinessId: data.profile.default_business_id
      };

      setUser(userData);
      setProfile(profileData);
      setIsAuthenticated(true);

      return {};
    } catch (err: any) {
      return { error: err.message || 'Invalid or expired link' };
    }
  }, [storeSession]);

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    const token = getSessionToken();
    
    if (token) {
      try {
        await supabase.functions.invoke('business-auth', {
          method: 'POST',
          body: { action: 'logout' },
          headers: { 'x-session-token': token }
        });
      } catch (err) {
        console.warn('[BusinessAuth] Logout request failed:', err);
      }
    }

    clearSession();
  }, [getSessionToken, clearSession]);

  const value = useMemo<BusinessAuthContextValue>(() => ({
    user,
    profile,
    isLoading,
    isAuthenticated,
    login,
    register,
    sendMagicLink,
    verifyMagicLink,
    logout,
    refreshSession,
    getSessionToken
  }), [user, profile, isLoading, isAuthenticated, login, register, sendMagicLink, verifyMagicLink, logout, refreshSession, getSessionToken]);

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
