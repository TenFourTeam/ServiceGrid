/**
 * Compatibility layer for migrating from direct Clerk usage to AuthKernel
 * This allows existing components to continue working while we migrate them
 */

import { useAuthSnapshot } from "@/auth/AuthKernel";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";

/**
 * Drop-in replacement for direct Clerk useAuth calls
 * Provides the same interface but uses centralized auth state where possible
 */
export function useAuthCompat() {
  const { snapshot, signOut } = useAuthSnapshot();
  const clerkAuth = useClerkAuth();

  return {
    // Use centralized state for these
    isLoaded: true, // AuthKernel handles loading states
    isSignedIn: snapshot.phase === 'authenticated',
    userId: snapshot.userId || null,
    
    // Delegate to Clerk for token operations (but prefer snapshot.token when available)
    getToken: clerkAuth.getToken,
    signOut,
    
    // Additional snapshot data not available in Clerk
    tenantId: snapshot.tenantId,
    roles: snapshot.roles,
    isLocked: snapshot.phase === 'locked',
    
    // For compatibility with existing code
    sessionId: clerkAuth.sessionId,
    sessionClaims: clerkAuth.sessionClaims,
  };
}

/**
 * Enhanced edgeFetchJson that uses AuthKernel token
 * Falls back to Clerk getToken if no snapshot token
 */
export async function edgeFetchJsonAuth(
  path: string, 
  opts: { method?: string; body?: any; headers?: Record<string, string> } = {}
) {
  const { snapshot } = useAuthSnapshot();
  const { getToken } = useClerkAuth();
  
  const token = snapshot.token || await getToken({ template: 'supabase' });
  if (!token) {
    throw new Error('No authentication token available');
  }
  
  const { method = 'GET', body, headers = {} } = opts;
  
  const response = await fetch(
    `https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/${path}`,
    {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    }
  );
  
  if (!response.ok) {
    throw new Error(`Edge function call failed: ${response.status}`);
  }
  
  return response.json();
}