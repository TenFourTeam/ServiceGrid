import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { useUserBusinesses } from '@/hooks/useUserBusinesses';

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
  
  // Fetch user businesses when authenticated
  const { data: businesses, isLoading: isLoadingBusinesses } = useUserBusinesses();

  const setCurrentBusinessId = useCallback((businessId: string | null) => {
    console.log('[CurrentBusinessContext] Setting current business ID:', businessId);
    setCurrentBusinessIdState(businessId);
  }, []);

  // Auto-initialize business context when user is authenticated and businesses are loaded
  useEffect(() => {
    if (!isLoaded) return; // Wait for Clerk to load
    
    if (!isSignedIn) {
      setCurrentBusinessIdState(null);
      setIsInitializing(false);
      return;
    }

    if (isLoadingBusinesses) return; // Wait for businesses to load

    // If no business is currently selected and we have businesses available
    if (!currentBusinessId && businesses && Array.isArray(businesses) && businesses.length > 0) {
      // Find the current default business or use the first one
      const defaultBusiness = businesses.find(b => b.is_current) || businesses[0];
      console.log('[CurrentBusinessContext] Auto-initializing with business:', defaultBusiness);
      if (defaultBusiness?.id) {
        setCurrentBusinessIdState(defaultBusiness.id);
      }
    }
    
    setIsInitializing(false);
  }, [isLoaded, isSignedIn, isLoadingBusinesses, businesses, currentBusinessId]);

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