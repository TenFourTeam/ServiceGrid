/**
 * Unified query exports - single import point for all queries
 * Migration complete: All hooks now use unified data pattern
 */

// Business and profile queries
export { useProfile } from '@/queries/useProfile';

// UNIFIED: Data hooks with count and full data (RECOMMENDED)
export { useCustomersData } from '@/hooks/useCustomersData';
export { useJobsData } from '@/hooks/useJobsData';
export { useQuotesData } from '@/hooks/useQuotesData';
export { useInvoicesData } from '@/hooks/useInvoicesData';

// LEGACY: Count-only queries (deprecated - use unified data hooks instead)
export { useCustomersCount } from '@/hooks/useCustomersCount';
export { useJobsCount } from '@/hooks/useJobsCount';
export { useQuotesCount } from '@/hooks/useQuotesCount';
export { useInvoicesCount } from '@/hooks/useInvoicesCount';

// LEGACY: Individual data queries (deprecated - kept for backward compatibility)
import { useSupabaseCustomers } from '@/hooks/useSupabaseCustomers';
import { useSupabaseJobs } from '@/hooks/useSupabaseJobs';
import { useSupabaseQuotes } from '@/hooks/useSupabaseQuotes';
import { useSupabaseInvoices } from '@/hooks/useSupabaseInvoices';

// Legacy wrapper functions - DEPRECATED
// TODO: Remove after all components migrated to unified hooks
export function useCustomers() {
  const result = useSupabaseCustomers();
  return { 
    ...result, 
    data: result.data?.rows || [] 
  };
}

export function useJobs() {
  const result = useSupabaseJobs();
  return { 
    ...result, 
    data: result.data?.rows || [] 
  };
}

export function useQuotes() {
  const result = useSupabaseQuotes();
  return { 
    ...result, 
    data: result.data?.rows || [] 
  };
}

export function useInvoices() {
  const result = useSupabaseInvoices();
  return { 
    ...result, 
    data: result.data?.rows || [] 
  };
}

// Billing queries
export { useStripeConnectStatus } from '@/hooks/useStripeConnectStatus';
export { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';