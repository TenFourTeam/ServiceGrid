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

// Billing queries - UNIFIED CRUD
export { useStripeConnect } from '@/hooks/useStripeConnect';
export { useSubscriptions } from '@/hooks/useSubscriptions';
export { usePayments } from '@/hooks/usePayments';

// AI Scheduling hooks
export { useAIScheduling } from '@/hooks/useAIScheduling';
export { useAutoScheduleRequest } from '@/hooks/useAutoScheduleRequest';
export { useTravelTimes } from '@/hooks/useTravelTimes';

// Route Planning and Mapping hooks
export { useGeocoding } from '@/hooks/useGeocoding';
export { useRouteRecalculation } from '@/hooks/useRouteRecalculation';

// Analytics hooks
export { useAnalyticsSummary } from '@/hooks/useAnalyticsSummary';
export { useTeamUtilization } from '@/hooks/useTeamUtilization';
export { usePredictiveInsights } from '@/hooks/usePredictiveInsights';

// Phase 6: Advanced Scheduling hooks
export { 
  useTeamAvailability, 
  useCreateAvailability, 
  useUpdateAvailability, 
  useDeleteAvailability 
} from '@/hooks/useTeamAvailability';

export { 
  useTimeOffRequests, 
  useCreateTimeOffRequest, 
  useUpdateTimeOffRequest, 
  useDeleteTimeOffRequest 
} from '@/hooks/useTimeOff';

export { 
  useBusinessConstraints, 
  useUpsertConstraint, 
  useUpdateConstraint, 
  useDeleteConstraint 
} from '@/hooks/useBusinessConstraints';

export { 
  useRecurringJobTemplates, 
  useCreateRecurringTemplate, 
  useUpdateRecurringTemplate, 
  useDeleteRecurringTemplate,
  useGenerateRecurringJobs,
  useCheckSchedulingCapacity
} from '@/hooks/useRecurringJobs';
