// Re-export all auth components and hooks for easy importing
export { AuthKernel, useAuthSnapshot } from './AuthKernel';
export { AuthBoundary } from './AuthBoundary';
export { useApiClient } from './ApiClient';
export { default as AuthErrorBoundary } from './AuthErrorBoundary';
export { default as LockScreen } from './LockScreen';
export * from './types';

// Compatibility hook for existing components that use Clerk directly
import { useAuthSnapshot } from './AuthKernel';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

/**
 * Drop-in replacement for useAuth from Clerk
 * Provides the same interface but uses centralized auth state
 */
export function useAuth() {
  const { snapshot, signOut } = useAuthSnapshot();
  const clerkAuth = useClerkAuth();

  return {
    // Auth state from centralized snapshot
    isLoaded: true, // AuthKernel handles loading
    isSignedIn: snapshot.phase === 'authenticated',
    userId: snapshot.userId || null,
    
    // Delegate to Clerk for token operations (but prefer snapshot.token)
    getToken: clerkAuth.getToken,
    signOut,
    
    // Additional snapshot data
    tenantId: snapshot.tenantId,
    roles: snapshot.roles,
  };
}