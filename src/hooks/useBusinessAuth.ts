import { useBusinessAuthContext } from '@/providers/BusinessAuthProvider';

/**
 * Primary hook for accessing business authentication
 * Use this for full access to auth state and actions
 */
export function useBusinessAuth() {
  return useBusinessAuthContext();
}

/**
 * Supabase Auth-based useAuth hook
 * Drop-in replacement for common auth patterns
 */
export function useAuth() {
  const { isAuthenticated, isLoading, user, session, logout } = useBusinessAuthContext();
  
  return {
    isSignedIn: isAuthenticated,
    isLoaded: !isLoading,
    userId: user?.profileId ?? null,
    session, // Expose session for debugging
    
    // Return JWT access token for API calls
    getToken: async (_options?: { template?: string; skipCache?: boolean }): Promise<string | null> => {
      return session?.access_token ?? null;
    },
    
    signOut: logout
  };
}

/**
 * Supabase Auth-based useUser hook
 * Drop-in replacement for common auth patterns
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
