import { useBusinessAuthContext } from '@/providers/BusinessAuthProvider';

/**
 * Primary hook for accessing business authentication
 * Use this for full access to auth state and actions
 */
export function useBusinessAuth() {
  return useBusinessAuthContext();
}

/**
 * Clerk-compatible useAuth hook
 * Drop-in replacement for @clerk/clerk-react useAuth
 */
export function useAuth() {
  const { isAuthenticated, isLoading, user, getSessionToken, logout } = useBusinessAuthContext();
  
  return {
    isSignedIn: isAuthenticated,
    isLoaded: !isLoading,
    userId: user?.profileId ?? null,
    
    // Async wrapper for compatibility with Clerk's API
    getToken: async (_options?: { template?: string; skipCache?: boolean }): Promise<string | null> => {
      return getSessionToken();
    },
    
    signOut: logout
  };
}

/**
 * Clerk-compatible useUser hook
 * Drop-in replacement for @clerk/clerk-react useUser
 */
export function useUser() {
  const { user, profile, isLoading } = useBusinessAuthContext();
  
  if (!profile) {
    return {
      user: null,
      isLoaded: !isLoading,
      isSignedIn: false
    };
  }
  
  return {
    user: {
      id: profile.id,
      primaryEmailAddress: {
        emailAddress: profile.email
      },
      emailAddresses: [{ emailAddress: profile.email }],
      fullName: profile.fullName,
      firstName: profile.fullName?.split(' ')[0] ?? null,
      lastName: profile.fullName?.split(' ').slice(1).join(' ') ?? null,
    },
    isLoaded: !isLoading,
    isSignedIn: true
  };
}

// Re-export for convenience
export { useBusinessAuthContext } from '@/providers/BusinessAuthProvider';
