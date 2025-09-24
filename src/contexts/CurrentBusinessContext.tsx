import React, { createContext, useContext, ReactNode, useEffect } from 'react';
import { useAuth, useOrganization, useOrganizationList } from '@clerk/clerk-react';

interface CurrentBusinessContextType {
  currentBusinessId: string | null;
  setCurrentBusinessId: (businessId: string | null) => void;
  isInitializing: boolean;
}

const CurrentBusinessContext = createContext<CurrentBusinessContextType | undefined>(undefined);

interface CurrentBusinessProviderProps {
  children: ReactNode;
}

export function CurrentBusinessProvider({ children }: CurrentBusinessProviderProps) {
  const { isSignedIn, isLoaded } = useAuth();
  const { organization, isLoaded: isOrgLoaded } = useOrganization();
  const { setActive, userMemberships, isLoaded: isMembershipsLoaded } = useOrganizationList();
  
  // Current business ID is the organization ID
  const currentBusinessId = organization?.id || null;
  
  // System is initializing if Clerk isn't loaded or if we're signed in but orgs aren't loaded
  const isInitializing = !isLoaded || (isSignedIn && (!isOrgLoaded || !isMembershipsLoaded));

  const setCurrentBusinessId = async (businessId: string | null) => {
    console.log('[CurrentBusinessContext] Switching to organization:', businessId);
    
    if (!setActive) {
      console.error('[CurrentBusinessContext] setActive not available');
      return;
    }

    try {
      if (businessId) {
        // Find the organization in our memberships
        const targetOrg = userMemberships?.data?.find(
          membership => membership.organization.id === businessId
        )?.organization;
        
        if (targetOrg) {
          await setActive({ organization: targetOrg });
          console.log('[CurrentBusinessContext] Successfully switched to:', targetOrg.name);
        } else {
          console.error('[CurrentBusinessContext] Organization not found in memberships:', businessId);
        }
      } else {
        // Set to null/personal account
        await setActive({ organization: null });
        console.log('[CurrentBusinessContext] Switched to personal account');
      }
    } catch (error) {
      console.error('[CurrentBusinessContext] Failed to switch organization:', error);
    }
  };

  // Auto-initialize with first organization if user has no active org but has memberships
  useEffect(() => {
    if (!isLoaded || !isSignedIn || isInitializing) return;
    
    // If no organization is active but user has memberships, activate the first one
    if (!organization && userMemberships?.data && userMemberships.data.length > 0) {
      const firstOrg = userMemberships.data[0].organization;
      console.log('[CurrentBusinessContext] Auto-activating first organization:', firstOrg.name);
      setCurrentBusinessId(firstOrg.id);
    }
  }, [isLoaded, isSignedIn, isInitializing, organization, userMemberships]);

  return (
    <CurrentBusinessContext.Provider value={{
      currentBusinessId,
      setCurrentBusinessId,
      isInitializing
    }}>
      {children}
    </CurrentBusinessContext.Provider>
  );
}

export function useCurrentBusiness() {
  const context = useContext(CurrentBusinessContext);
  if (context === undefined) {
    throw new Error('useCurrentBusiness must be used within a CurrentBusinessProvider');
  }
  return context;
}