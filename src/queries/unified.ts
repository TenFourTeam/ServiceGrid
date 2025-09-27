/**
 * Unified query exports - single import point for all queries
 * Migration complete: All hooks now use unified data pattern
 */

// Business and profile queries
export { useProfile } from '@/queries/useProfile';

// User business access queries
export { useUserBusinesses } from '@/hooks/useUserBusinesses';
export { useUserPendingInvites } from '@/hooks/useUserPendingInvites';

// UNIFIED: Data hooks with standardized { data: array, count: number } format (RECOMMENDED)
export { useCustomersData } from '@/hooks/useCustomersData';
export { useJobsData } from '@/hooks/useJobsData';
export { useQuotesData } from '@/hooks/useQuotesData';
export { useInvoicesData } from '@/hooks/useInvoicesData';
export { useRequestsData } from '@/hooks/useRequestsData';
export { useBusinessMembersData, useBusinessMemberOperations } from '@/hooks/useBusinessMembers';

// Optimized data hooks - unified count + data pattern

// Billing queries
export { useStripeConnectStatus } from '@/hooks/useStripeConnectStatus';
export { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';