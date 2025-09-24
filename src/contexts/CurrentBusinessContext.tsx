import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useAuth, useOrganizationList } from '@clerk/clerk-react';

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
  const [currentBusinessId, setCurrentBusinessIdState] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Fetch user organizations from Clerk when authenticated
  const { userMemberships, isLoaded: isOrganizationsLoaded } = useOrganizationList();

  const setCurrentBusinessId = useCallback((businessId: string | null) => {
    console.log('[CurrentBusinessContext] Setting current business ID:', businessId);
    setCurrentBusinessIdState(businessId);
  }, []);

  // Auto-initialize currentBusinessId when organizations are loaded
  useEffect(() => {
    if (!isLoaded) return; // Wait for Clerk to load
    
    if (!isSignedIn) {
      setCurrentBusinessId(null);
      setIsInitializing(false);
      return;
    }

    if (!isOrganizationsLoaded) return; // Wait for organizations to load

    // If no business is currently selected and we have organizations available
    if (!currentBusinessId && userMemberships?.data && userMemberships.data.length > 0) {
      const currentOrg = userMemberships.data[0];
      if (currentOrg?.organization?.id) {
        console.log('[CurrentBusinessContext] Auto-initializing with organization:', currentOrg.organization.name);
        setCurrentBusinessId(currentOrg.organization.id);
      }
    }
    
    setIsInitializing(false);
  }, [isLoaded, isSignedIn, isOrganizationsLoaded, userMemberships?.data, currentBusinessId, setCurrentBusinessId]);

  const contextValue = {
    currentBusinessId,
    setCurrentBusinessId,
    isInitializing: isInitializing || !isOrganizationsLoaded
  };

  return (
    <CurrentBusinessContext.Provider value={contextValue}>
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