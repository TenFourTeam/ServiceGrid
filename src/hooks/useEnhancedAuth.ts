import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuthErrorRecovery } from './useAuthErrorRecovery';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { authMonitor } from '@/utils/authMonitor';

/**
 * Enhanced authentication hook with improved error handling and monitoring
 */
export function useEnhancedAuth() {
  const clerkAuth = useClerkAuth();
  const { retryWithAuthRecovery } = useAuthErrorRecovery();
  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isLoading: true,
    lastTokenRefresh: null as Date | null,
    consecutiveFailures: 0,
  });

  // Monitor auth state changes
  useEffect(() => {
    const updateAuthState = () => {
      setAuthState(prev => ({
        ...prev,
        isAuthenticated: !!clerkAuth.isSignedIn,
        isLoading: !clerkAuth.isLoaded,
      }));
    };

    updateAuthState();
  }, [clerkAuth.isSignedIn, clerkAuth.isLoaded]);

  // Enhanced token getter with monitoring
  const getToken = useCallback(async (options?: { skipCache?: boolean }) => {
    try {
      const token = await clerkAuth.getToken({
        skipCache: options?.skipCache || false,
      });
      
      if (token) {
        setAuthState(prev => ({
          ...prev,
          lastTokenRefresh: new Date(),
          consecutiveFailures: 0,
        }));
        
        authMonitor.log({
          type: 'token_refresh',
          success: true,
          details: { skipCache: options?.skipCache }
        });
        
        console.info('[useEnhancedAuth] Token retrieved successfully');
      }
      
      return token;
    } catch (error) {
      setAuthState(prev => ({
        ...prev,
        consecutiveFailures: prev.consecutiveFailures + 1,
      }));
      
      console.error('[useEnhancedAuth] Token retrieval failed:', error);
      
      // Show user-friendly error after multiple failures
      if (authState.consecutiveFailures >= 2) {
        toast.error('Authentication session expired. Please sign in again.');
      }
      
      throw error;
    }
  }, [clerkAuth.getToken, authState.consecutiveFailures]);

  // Enhanced authenticated request wrapper
  const makeAuthenticatedRequest = useCallback(async <T>(
    operation: () => Promise<T>,
    options?: { maxRetries?: number }
  ): Promise<T> => {
    return retryWithAuthRecovery(operation, options?.maxRetries || 1);
  }, [retryWithAuthRecovery]);

  // Monitor token health
  const isTokenStale = useCallback(() => {
    if (!authState.lastTokenRefresh) return false;
    
    const staleThreshold = 50 * 60 * 1000; // 50 minutes
    return Date.now() - authState.lastTokenRefresh.getTime() > staleThreshold;
  }, [authState.lastTokenRefresh]);

  // Proactive token refresh for long-running sessions
  useEffect(() => {
    if (!clerkAuth.isSignedIn || !clerkAuth.isLoaded) return;

    const interval = setInterval(async () => {
      if (isTokenStale()) {
        console.info('[useEnhancedAuth] Proactively refreshing stale token');
        try {
          await getToken({ skipCache: true });
        } catch (error) {
          console.warn('[useEnhancedAuth] Proactive token refresh failed:', error);
        }
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [clerkAuth.isSignedIn, clerkAuth.isLoaded, isTokenStale, getToken]);

  return {
    // Expose all Clerk auth properties
    ...clerkAuth,
    
    // Enhanced methods
    getToken,
    makeAuthenticatedRequest,
    
    // Auth state monitoring
    authState,
    isTokenStale: isTokenStale(),
    
    // Helper methods
    refreshToken: () => getToken({ skipCache: true }),
  };
}