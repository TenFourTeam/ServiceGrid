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
    if (isSignedIn && userMemberships?.data && isOrganizationsLoaded && !currentBusinessId) {
      // Use the first organization as the current business
      const currentOrg = userMemberships.data[0];
      if (currentOrg) {
        setCurrentBusinessId(currentOrg.organization.id);
        setIsInitializing(false);
      }
    } else if (!isSignedIn) {
      // Clear business context when user is not signed in
      setCurrentBusinessId(null);
      setIsInitializing(false);
    }
  }, [isSignedIn, userMemberships?.data, isOrganizationsLoaded, currentBusinessId, setCurrentBusinessId]);

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