/**
 * Temporary migration helper to provide fallback store functionality
 * This prevents build errors while we complete the React Query migration
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useStandardMutation } from '@/mutations/useStandardMutation';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { queryKeys } from '@/queries/keys';

/**
 * Legacy store fallback for components still being migrated
 * Returns empty functions to prevent runtime errors
 */
export function useLegacyStoreFallback() {
  const queryClient = useQueryClient();

  return {
    // Business operations (now handled via React Query)
    setBusiness: () => {
      console.warn('[Migration] setBusiness called - use React Query invalidation instead');
      queryClient.invalidateQueries({ queryKey: queryKeys.business.current() });
    },
    
    // Customer operations
    upsertCustomer: () => {
      console.warn('[Migration] upsertCustomer called - use mutations instead');
    },
    deleteCustomer: () => {
      console.warn('[Migration] deleteCustomer called - use mutations instead');
    },
    
    // Quote operations
    upsertQuote: () => {
      console.warn('[Migration] upsertQuote called - use mutations instead');
    },
    deleteQuote: () => {
      console.warn('[Migration] deleteQuote called - use mutations instead');
    },
    
    // Job operations
    upsertJob: () => {
      console.warn('[Migration] upsertJob called - use mutations instead');
    },
    updateJobStatus: () => {
      console.warn('[Migration] updateJobStatus called - use mutations instead');
    },
    
    // Invoice operations
    sendInvoice: () => {
      console.warn('[Migration] sendInvoice called - use mutations instead');
    },
    
    // Legacy data structure (empty for compatibility)
    business: { id: '', name: '', nameCustomized: false },
    customers: [],
    jobs: [],
    quotes: [],
    invoices: [],
  };
}