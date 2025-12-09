import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  CustomerAuthState, 
  CustomerAccount, 
  CustomerWithBusiness,
  CustomerAuthResponse 
} from '@/types/customerAuth';

const CUSTOMER_SESSION_KEY = 'customer_session_token';

interface CustomerAuthContextValue extends CustomerAuthState {
  sendMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  verifyMagicLink: (token: string) => Promise<CustomerAuthResponse>;
  login: (email: string, password: string) => Promise<CustomerAuthResponse>;
  register: (email: string, password: string, inviteToken?: string) => Promise<CustomerAuthResponse>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}

export function useCustomerAuthProvider() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  
  const [state, setState] = useState<CustomerAuthState>({
    customer: null,
    customerDetails: null,
    authMethod: null,
    isLoading: true,
    isAuthenticated: false,
    sessionToken: null,
  });

  // Check session on mount
  useEffect(() => {
    checkAuth();
  }, [isSignedIn, userId]);

  const checkAuth = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // First check Clerk auth for customers
      if (isSignedIn && user) {
        const userType = user.publicMetadata?.userType;
        
        if (userType === 'customer') {
          // Verify customer with our backend
          const response = await supabase.functions.invoke('customer-auth/clerk-verify', {
            body: { 
              clerk_user_id: userId,
              email: user.primaryEmailAddress?.emailAddress,
            },
          });

          if (response.data?.authenticated) {
            setState({
              customer: response.data.customer_account,
              customerDetails: response.data.customer,
              authMethod: 'clerk',
              isLoading: false,
              isAuthenticated: true,
              sessionToken: null,
            });
            return;
          }
        }
      }

      // Check session-based auth
      const sessionToken = localStorage.getItem(CUSTOMER_SESSION_KEY);
      if (sessionToken) {
        const response = await supabase.functions.invoke('customer-auth/session', {
          headers: { 'x-session-token': sessionToken },
        });

        if (response.data?.authenticated) {
          setState({
            customer: response.data.customer_account,
            customerDetails: response.data.customer,
            authMethod: response.data.customer_account.auth_method,
            isLoading: false,
            isAuthenticated: true,
            sessionToken,
          });
          return;
        } else {
          // Invalid session, clear it
          localStorage.removeItem(CUSTOMER_SESSION_KEY);
        }
      }

      // Not authenticated
      setState({
        customer: null,
        customerDetails: null,
        authMethod: null,
        isLoading: false,
        isAuthenticated: false,
        sessionToken: null,
      });
    } catch (error) {
      console.error('Auth check error:', error);
      setState({
        customer: null,
        customerDetails: null,
        authMethod: null,
        isLoading: false,
        isAuthenticated: false,
        sessionToken: null,
      });
    }
  }, [isSignedIn, userId, user]);

  const sendMagicLink = useCallback(async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}`;
      const response = await supabase.functions.invoke('customer-auth/magic-link', {
        body: { email, redirect_url: redirectUrl },
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to send magic link' };
    }
  }, []);

  const verifyMagicLink = useCallback(async (token: string): Promise<CustomerAuthResponse> => {
    try {
      const response = await supabase.functions.invoke('customer-auth/verify-magic', {
        body: { token },
      });

      if (response.error || !response.data?.success) {
        return { success: false, error: response.error?.message || response.data?.error || 'Invalid magic link' };
      }

      // Store session token
      if (response.data.session_token) {
        localStorage.setItem(CUSTOMER_SESSION_KEY, response.data.session_token);
      }

      setState({
        customer: response.data.customer_account,
        customerDetails: response.data.customer,
        authMethod: 'magic_link',
        isLoading: false,
        isAuthenticated: true,
        sessionToken: response.data.session_token,
      });

      return response.data;
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to verify magic link' };
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<CustomerAuthResponse> => {
    try {
      const response = await supabase.functions.invoke('customer-auth/login', {
        body: { email, password },
      });

      if (response.error || !response.data?.success) {
        return { success: false, error: response.error?.message || response.data?.error || 'Login failed' };
      }

      // Store session token
      if (response.data.session_token) {
        localStorage.setItem(CUSTOMER_SESSION_KEY, response.data.session_token);
      }

      setState({
        customer: response.data.customer_account,
        customerDetails: response.data.customer,
        authMethod: 'password',
        isLoading: false,
        isAuthenticated: true,
        sessionToken: response.data.session_token,
      });

      return response.data;
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  }, []);

  const register = useCallback(async (email: string, password: string, inviteToken?: string): Promise<CustomerAuthResponse> => {
    try {
      const response = await supabase.functions.invoke('customer-auth/register', {
        body: { email, password, invite_token: inviteToken },
      });

      if (response.error || !response.data?.success) {
        return { success: false, error: response.error?.message || response.data?.error || 'Registration failed' };
      }

      // Store session token
      if (response.data.session_token) {
        localStorage.setItem(CUSTOMER_SESSION_KEY, response.data.session_token);
      }

      setState({
        customer: response.data.customer_account,
        customerDetails: response.data.customer,
        authMethod: 'password',
        isLoading: false,
        isAuthenticated: true,
        sessionToken: response.data.session_token,
      });

      return response.data;
    } catch (error: any) {
      return { success: false, error: error.message || 'Registration failed' };
    }
  }, []);

  const logout = useCallback(async () => {
    const sessionToken = localStorage.getItem(CUSTOMER_SESSION_KEY);
    
    try {
      if (sessionToken) {
        await supabase.functions.invoke('customer-auth/logout', {
          headers: { 'x-session-token': sessionToken },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    }

    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    
    setState({
      customer: null,
      customerDetails: null,
      authMethod: null,
      isLoading: false,
      isAuthenticated: false,
      sessionToken: null,
    });
  }, []);

  const refreshSession = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    sendMagicLink,
    verifyMagicLink,
    login,
    register,
    logout,
    refreshSession,
  };
}

export { CustomerAuthContext };
