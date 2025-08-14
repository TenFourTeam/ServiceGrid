import { useAuth, useUser } from '@clerk/clerk-react';
import { useBusiness } from '@/queries/useBusiness';

/**
 * Combined business + auth hook to replace useAuthSnapshot
 * Provides unified interface for authentication and business context
 */
export function useBusinessAuth() {
  const clerkAuth = useAuth();
  const { user } = useUser();
  const businessQuery = useBusiness();
  
  // Calculate auth phase
  const getPhase = () => {
    if (!clerkAuth.isLoaded) return 'loading';
    if (!clerkAuth.isSignedIn) return 'signed_out';
    return 'authenticated';
  };

  const business = businessQuery.data;
  
  // Provide authentication and business context
  const snapshot = {
    phase: getPhase(),
    userId: clerkAuth.userId || undefined,
    email: user?.primaryEmailAddress?.emailAddress,
    businessId: business?.id,
    businessName: business?.name,
    business,
    tenantId: business?.id || 'default',
    roles: business ? ['owner'] : [] as const,
    claimsVersion: 1,
  };

  return {
    snapshot,
    isAuthenticated: clerkAuth.isSignedIn,
    isLoaded: clerkAuth.isLoaded,
    signOut: clerkAuth.signOut,
    // Business helpers
    currentBusiness: {
      id: business?.id,
      name: business?.name,
      isLoaded: !businessQuery.isLoading && !!business,
    },
    refreshBusiness: businessQuery.refetch,
  };
}