import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@clerk/clerk-react';

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
  const { isLoaded } = useAuth();
  
  // In single-tenant model, we don't need business switching
  const currentBusinessId = null;
  const isInitializing = !isLoaded;

  const setCurrentBusinessId = async (businessId: string | null) => {
    console.log('[CurrentBusinessContext] Business switching not available in single-tenant mode');
    // No-op in single tenant mode
  };

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