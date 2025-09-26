import { useState, useEffect } from 'react';
import { usePrimaryBusiness } from './usePrimaryBusiness';
import { useExternalMemberships } from './useExternalMemberships';

export interface SelectedBusiness {
  id: string;
  name: string;
  description?: string;
  phone?: string;
  replyToEmail?: string;
  taxRateDefault?: number;
  logoUrl?: string;
  lightLogoUrl?: string;
  role: 'owner' | 'worker';
}

/**
 * Hook for managing business selection state
 * Defaults to primary business, allows switching to external memberships
 */
export function useSelectedBusiness() {
  const { data: primaryBusiness } = usePrimaryBusiness();
  const { data: externalMemberships } = useExternalMemberships();
  
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

  // Default to primary business when it loads
  useEffect(() => {
    if (primaryBusiness && !selectedBusinessId) {
      setSelectedBusinessId(primaryBusiness.id);
    }
  }, [primaryBusiness, selectedBusinessId]);

  // Find the selected business data
  const selectedBusiness: SelectedBusiness | null = (() => {
    if (!selectedBusinessId) return null;
    
    // Check if it's the primary business
    if (primaryBusiness && primaryBusiness.id === selectedBusinessId) {
      return primaryBusiness;
    }
    
    // Check external memberships
    const externalBusiness = externalMemberships?.find(b => b.id === selectedBusinessId);
    if (externalBusiness) {
      return {
        id: externalBusiness.id,
        name: externalBusiness.name,
        logoUrl: externalBusiness.logo_url,
        role: externalBusiness.role as 'worker'
      };
    }
    
    return null;
  })();

  const selectBusiness = (businessId: string) => {
    setSelectedBusinessId(businessId);
  };

  const selectPrimaryBusiness = () => {
    if (primaryBusiness) {
      setSelectedBusinessId(primaryBusiness.id);
    }
  };

  return {
    selectedBusiness,
    selectedBusinessId,
    selectBusiness,
    selectPrimaryBusiness,
    canManage: selectedBusiness?.role === 'owner',
    isPrimarySelected: selectedBusiness?.id === primaryBusiness?.id,
  };
}