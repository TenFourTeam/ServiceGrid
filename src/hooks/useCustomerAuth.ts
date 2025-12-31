import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { 
  CustomerAuthState, 
  CustomerAccount, 
  CustomerWithBusiness,
  CustomerAuthResponse,
  CustomerBusiness 
} from '@/types/customerAuth';

const CUSTOMER_SESSION_KEY = 'customer_session_token';

interface SendMagicLinkResult {
  success: boolean;
  error?: string;
  emailSent?: boolean;
  warning?: string;
}

interface SetPasswordResult {
  success: boolean;
  error?: string;
}

interface CustomerAuthContextValue extends CustomerAuthState {
  sendMagicLink: (email: string) => Promise<SendMagicLinkResult>;
  verifyMagicLink: (token: string) => Promise<CustomerAuthResponse>;
  login: (email: string, password: string) => Promise<CustomerAuthResponse>;
  register: (email: string, password: string, inviteToken?: string) => Promise<CustomerAuthResponse>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  setPassword: (password: string) => Promise<SetPasswordResult>;
  hasPassword: boolean;
}

const CustomerAuthContext = createContext<CustomerAuthContextValue | null>(null);

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}

interface ExtendedCustomerAuthState extends CustomerAuthState {
  hasPassword: boolean;
}

const initialState: ExtendedCustomerAuthState = {
  customer: null,
  customerDetails: null,
  authMethod: null,
  isLoading: true,
  isAuthenticated: false,
  sessionToken: null,
  availableBusinesses: [],
  activeBusinessId: null,
  activeCustomerId: null,
  hasPassword: false,
};

export function useCustomerAuthProvider() {
  const [state, setState] = useState<ExtendedCustomerAuthState>(initialState);

  // Check session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
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
            availableBusinesses: response.data.available_businesses || [],
            activeBusinessId: response.data.active_business_id || response.data.customer?.business_id || null,
            activeCustomerId: response.data.active_customer_id || response.data.customer?.id || null,
            hasPassword: response.data.customer_account.has_password || false,
          });
          return;
        } else {
          // Invalid session, clear it
          localStorage.removeItem(CUSTOMER_SESSION_KEY);
        }
      }

      // Not authenticated
      setState({
        ...initialState,
        isLoading: false,
      });
    } catch (error) {
      console.error('Auth check error:', error);
      setState({
        ...initialState,
        isLoading: false,
      });
    }
  }, []);

  const sendMagicLink = useCallback(async (email: string): Promise<SendMagicLinkResult> => {
    try {
      const redirectUrl = `${window.location.origin}`;
      const response = await supabase.functions.invoke('customer-auth/magic-link', {
        body: { email, redirect_url: redirectUrl },
      });

      if (response.error) {
        return { success: false, error: response.error.message };
      }

      // Return the enhanced response including emailSent status
      return { 
        success: response.data?.success ?? true,
        emailSent: response.data?.emailSent,
        warning: response.data?.warning,
        error: response.data?.error,
      };
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
        availableBusinesses: response.data.available_businesses || [],
        activeBusinessId: response.data.active_business_id || response.data.customer?.business_id || null,
        activeCustomerId: response.data.active_customer_id || response.data.customer?.id || null,
        hasPassword: false, // Magic link login means no password set yet
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
        availableBusinesses: response.data.available_businesses || [],
        activeBusinessId: response.data.active_business_id || response.data.customer?.business_id || null,
        activeCustomerId: response.data.active_customer_id || response.data.customer?.id || null,
        hasPassword: true, // Password login means they have a password
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
        availableBusinesses: response.data.available_businesses || [],
        activeBusinessId: response.data.active_business_id || response.data.customer?.business_id || null,
        activeCustomerId: response.data.active_customer_id || response.data.customer?.id || null,
        hasPassword: true, // Registration with password
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
      ...initialState,
      isLoading: false,
    });
  }, []);

  const refreshSession = useCallback(async () => {
    await checkAuth();
  }, [checkAuth]);

  const setPassword = useCallback(async (password: string): Promise<SetPasswordResult> => {
    const sessionToken = localStorage.getItem(CUSTOMER_SESSION_KEY);
    
    if (!sessionToken) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await supabase.functions.invoke('customer-auth/set-password', {
        headers: { 'x-session-token': sessionToken },
        body: { password },
      });

      if (response.error || !response.data?.success) {
        return { success: false, error: response.error?.message || response.data?.error || 'Failed to set password' };
      }

      // Update local state
      setState(prev => ({
        ...prev,
        hasPassword: true,
        authMethod: 'password',
      }));

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to set password' };
    }
  }, []);

  return {
    ...state,
    sendMagicLink,
    verifyMagicLink,
    login,
    register,
    logout,
    refreshSession,
    setPassword,
    hasPassword: state.hasPassword,
  };
}

export { CustomerAuthContext };