/**
 * Unified query exports - single import point for all queries
 * All actual implementations are in their individual hook files
 */
import { useSupabaseCustomers } from '@/hooks/useSupabaseCustomers';
import { useSupabaseJobs } from '@/hooks/useSupabaseJobs';
import { useSupabaseQuotes } from '@/hooks/useSupabaseQuotes';
import { useSupabaseInvoices } from '@/hooks/useSupabaseInvoices';

// Business and profile queries
// Note: useBusiness is now internal to useBusinessContext for consolidation
export { useProfile } from '@/queries/useProfile';

// Count queries
export { useCustomersCount } from '@/hooks/useCustomersCount';
export { useJobsCount } from '@/hooks/useJobsCount';
export { useQuotesCount } from '@/hooks/useQuotesCount';
export { useInvoicesCount } from '@/hooks/useInvoicesCount';

// Full data queries - simplified without wrapper pattern
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