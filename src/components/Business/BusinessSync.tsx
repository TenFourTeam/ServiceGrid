import { useEffect } from 'react';
import { useAuthSnapshot } from '@/auth';
import { useStore } from '@/store/useAppStore';
import { Business } from '@/types';

/**
 * Syncs auth business data to the local store
 * Must be rendered inside AuthKernel to access auth context
 */
export function BusinessSync() {
  const { snapshot } = useAuthSnapshot();
  const store = useStore();

  useEffect(() => {
    if (snapshot.phase === 'authenticated' && snapshot.business) {
      const authBusiness: Business = {
        id: snapshot.business.id,
        name: snapshot.business.name,
        name_customized: snapshot.business.name_customized,
        phone: snapshot.business.phone || '',
        replyToEmail: snapshot.business.replyToEmail || '',
        taxRateDefault: snapshot.business.taxRateDefault || 0.08,
        numbering: {
          estPrefix: snapshot.business.estPrefix || 'QUO-',
          estSeq: snapshot.business.estSeq || 1,
          invPrefix: snapshot.business.invPrefix || 'INV-',
          invSeq: snapshot.business.invSeq || 1,
        },
      };
      
      // Only update if business ID has changed (switching businesses)
      // Don't overwrite local changes to name, phone, etc.
      if (store.business.id !== authBusiness.id) {
        store.setBusiness(authBusiness);
      }
    }
  }, [snapshot.phase, snapshot.business, store.business.id, store]);

  return null; // This is a side-effect only component
}