/**
 * Unified query exports - single import point for all queries
 * New unified data hooks provide both count and full data with smart fetching
 */

// Business and profile queries
export { useProfile } from '@/queries/useProfile';

// Legacy count-only queries (deprecated - use unified data hooks instead)
export { useCustomersCount } from '@/hooks/useCustomersCount';
export { useJobsCount } from '@/hooks/useJobsCount';
export { useQuotesCount } from '@/hooks/useQuotesCount';
export { useInvoicesCount } from '@/hooks/useInvoicesCount';

// Legacy full data queries (backward compatible data unwrapping)
import { useSupabaseCustomers } from '@/hooks/useSupabaseCustomers';
import { useSupabaseJobs } from '@/hooks/useSupabaseJobs';
import { useSupabaseQuotes } from '@/hooks/useSupabaseQuotes';
import { useSupabaseInvoices } from '@/hooks/useSupabaseInvoices';

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

// NEW: Unified data hooks (recommended)
export { useCustomersData } from '@/hooks/useCustomersData';
export { useJobsData } from '@/hooks/useJobsData';
export { useQuotesData } from '@/hooks/useQuotesData';
export { useInvoicesData } from '@/hooks/useInvoicesData';

// Billing queries
export { useStripeConnectStatus } from '@/hooks/useStripeConnectStatus';
export { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';