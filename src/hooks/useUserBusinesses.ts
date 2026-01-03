import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useAuth, useBusinessAuth } from '@/hooks/useBusinessAuth';
import { useState, useEffect } from 'react';

// Logging helper with timestamps
function authLog(category: string, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  console.log(`[${timestamp}] [useUserBusinesses:${category}] ${message}`, data ? data : '');
}

export interface UserBusiness {
  id: string;
  name: string;
  logo_url?: string;
  light_logo_url?: string;
  description?: string;
  phone?: string;
  reply_to_email?: string;
  tax_rate_default?: number;
  role: 'owner' | 'worker';
  joined_at: string;
  is_current: boolean;
}

/**
 * Hook to fetch all businesses the current user is a member of
 */
export function useUserBusinesses() {
  const { isSignedIn, isLoaded } = useAuth();
  const { session } = useBusinessAuth();
  const authApi = useAuthApi();
  
  // Check if we have an actual access token (not just isSignedIn)
  const hasToken = !!session?.access_token;
  
  // Token stability guard - wait a tick after token becomes available
  // to avoid queries during token refresh transitions
  const [isTokenStable, setIsTokenStable] = useState(false);
  
  useEffect(() => {
    if (hasToken) {
      authLog('TOKEN', 'Token detected - waiting for stability', { hasToken });
      const timer = setTimeout(() => {
        authLog('TOKEN', 'Token is now stable');
        setIsTokenStable(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      authLog('TOKEN', 'No token - resetting stability');
      setIsTokenStable(false);
    }
  }, [hasToken]);

  const queryEnabled = isLoaded && isSignedIn && isTokenStable;
  
  authLog('QUERY', 'Query status check', { 
    isLoaded, 
    isSignedIn, 
    hasToken, 
    isTokenStable, 
    enabled: queryEnabled 
  });

  return useQuery<UserBusiness[], Error>({
    queryKey: ['user-businesses'],
    queryFn: async () => {
      authLog('API', 'Fetching businesses from API');
      
      const { data, error } = await authApi.invoke('user-businesses', {
        method: 'GET'
      });
      
      if (error) {
        authLog('API', 'API error', { error: error.message });
        
        // Check for auth-specific errors that indicate invalid session
        const authErrorPatterns = [
          'Invalid or expired session',
          'User from sub claim',
          'Missing authentication',
          'JWT',
          'Profile not found'
        ];
        const isAuthError = authErrorPatterns.some(pattern => 
          error.message?.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (isAuthError) {
          authLog('API', 'Auth error detected - marking as AUTH_INVALID');
          throw new Error('AUTH_INVALID');
        }
        
        throw new Error(error.message || 'Failed to fetch user businesses');
      }
      
      const businesses = data?.data || [];
      authLog('API', 'API response received', { 
        count: businesses.length,
        businesses: businesses.map((b: UserBusiness) => ({ id: b.id, name: b.name, role: b.role }))
      });
      
      return businesses;
    },
    // Only enable when we have auth AND a stable access token
    enabled: queryEnabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    retry: (failureCount, error) => {
      // Don't retry auth errors - they won't resolve without re-login
      if (error.message === 'AUTH_INVALID') {
        authLog('RETRY', 'Not retrying AUTH_INVALID error');
        return false;
      }
      authLog('RETRY', 'Retrying query', { failureCount });
      return failureCount < 2;
    },
  });
}
