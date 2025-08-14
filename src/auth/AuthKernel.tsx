import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { useAuth as useClerkAuth, useUser } from "@clerk/clerk-react";
import { AuthSnapshot, AuthContextValue, AuthBootstrapResult, TenantRole } from "./types";

const AuthContext = createContext<AuthContextValue | null>(null);

function createInitialSnapshot(): AuthSnapshot {
  return {
    phase: 'loading',
    roles: [],
    claimsVersion: 0,
  };
}

export function AuthKernel({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId, signOut: clerkSignOut } = useClerkAuth();
  const { user } = useUser();
  const [snapshot, setSnapshot] = useState<AuthSnapshot>(createInitialSnapshot);
  const bootstrapRanRef = useRef(false);

  // Bootstrap process - await tenant/role data
  const runBootstrap = useCallback(async (): Promise<AuthBootstrapResult | null> => {
    try {
      // Use edgeRequest for unified token handling
      const { edgeRequest } = await import('@/utils/edgeApi');
      const { fn } = await import('@/utils/functionUrl');
      
      console.log("[AuthKernel] Starting get-business...");
      const result = await edgeRequest(fn('get-business'), {
        method: 'GET',
      });
      
      console.log("[AuthKernel] Bootstrap result:", result);

      return {
        tenantId: result.business?.id || 'default',
        roles: [result.business?.role || 'worker'] as TenantRole[],
        businessId: result.business?.id || 'default',
        businessName: result.business?.name || 'ServiceGrid'
      };
    } catch (error: any) {
      console.error('[AuthKernel] Bootstrap failed:', error);
      
      // Handle specific error types
      if (error.message === 'AUTH_NO_JWT') {
        setSnapshot(prev => ({ ...prev, phase: 'signed_out' }));
      }
      return null;
    }
  }, []);

  // Sign out handler
  const signOut = useCallback(async () => {
    try {
      await clerkSignOut();
      setSnapshot(createInitialSnapshot());
    } catch (error) {
      console.error('[AuthKernel] Sign out failed:', error);
    }
  }, [clerkSignOut]);

  // Force refresh auth state
  const refreshAuth = useCallback(async () => {
    try {
      if (!isSignedIn) return;
      
      const bootstrap = await runBootstrap();
      if (bootstrap) {
        setSnapshot(prev => ({
          ...prev,
          phase: 'authenticated',
          tenantId: bootstrap.tenantId,
          roles: bootstrap.roles,
          claimsVersion: prev.claimsVersion + 1,
          // Update business context
          businessId: bootstrap.businessId,
          businessName: bootstrap.businessName,
          business: {
            id: bootstrap.businessId,
            name: bootstrap.businessName,
          },
        }));
      }
    } catch (error: any) {
      console.error('[AuthKernel] Auth refresh failed:', error);
      
      // Handle specific error types  
      if (error.message === 'AUTH_NO_JWT') {
        setSnapshot(prev => ({ ...prev, phase: 'signed_out' }));
      }
      throw error;
    }
  }, [isSignedIn, runBootstrap]);

  // Main auth state management
  useEffect(() => {
    if (!isLoaded) {
      setSnapshot(prev => ({ ...prev, phase: 'loading' }));
      return;
    }

    if (!isSignedIn) {
      setSnapshot(prev => ({ ...prev, phase: 'signed_out' }));
      bootstrapRanRef.current = false;
      return;
    }

    // User is signed in - run bootstrap if not already done
    if (!bootstrapRanRef.current) {
      bootstrapRanRef.current = true;
      
      const initializeAuth = async () => {
        const bootstrap = await runBootstrap();
        if (bootstrap) {
          setSnapshot(prev => ({
            ...prev,
            phase: 'authenticated',
            userId: userId || undefined,
            email: user?.primaryEmailAddress?.emailAddress,
            tenantId: bootstrap.tenantId,
            roles: bootstrap.roles,
            claimsVersion: 1,
            // Add business context
            businessId: bootstrap.businessId,
            businessName: bootstrap.businessName,
            business: {
              id: bootstrap.businessId,
              name: bootstrap.businessName,
            },
          }));
        } else {
          // Bootstrap failed - keep in loading to show error
          setSnapshot(prev => ({ ...prev, phase: 'loading' }));
        }
      };

      initializeAuth();
    }
  }, [isLoaded, isSignedIn, userId, user, runBootstrap]);

  const contextValue: AuthContextValue = {
    snapshot,
    refreshAuth,
    signOut,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthSnapshot() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthSnapshot must be used within AuthKernel');
  }
  return context;
}
