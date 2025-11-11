import type { QueryClient } from '@tanstack/react-query';

/**
 * Centralized query key factory to prevent cache fragmentation
 * All query keys should be created through this module
 */

const queryKeys = {
  // Profile queries
  profile: {
    current: () => ['profile', 'current'] as const,
    byId: (userId: string, businessId?: string) => 
      businessId ? ['profile', userId, businessId] as const
                 : ['profile', userId] as const,
    forBusiness: (businessId: string) => ['profile', 'business', businessId] as const,
    byUserAndBusiness: (userId: string, businessId?: string) => 
      businessId ? ['profile', 'user', userId, 'business', businessId] as const
                 : ['profile', 'user', userId] as const,
  },
  
  // Business queries
  business: {
    current: () => ['business', 'current'] as const,
    byId: (id: string) => ['business', id] as const,
    members: (businessId: string) => ['business', businessId, 'members'] as const,
    auditLogs: (businessId: string) => ['business', businessId, 'audit-logs'] as const,
  },
  
  // Team and invite queries
  team: {
    members: (businessId: string) => ['business-members', businessId] as const,
    invites: (businessId: string) => ['pending-invites', businessId] as const,
    userBusinesses: () => ['user-businesses'] as const,
  },
  
  // Unified data queries - simplified architecture
  data: {
    customers: (businessId: string) => ['data', 'customers', businessId] as const,
    jobs: (businessId: string, userId?: string) => userId ? ['data', 'jobs', businessId, userId] as const : ['data', 'jobs', businessId] as const,
    quotes: (businessId: string) => ['data', 'quotes', businessId] as const,
    invoices: (businessId: string) => ['data', 'invoices', businessId] as const,
    recurringSchedules: (businessId: string) => ['data', 'recurring-schedules', businessId] as const,
    payments: (invoiceId: string) => ['data', 'payments', invoiceId] as const,
    requests: (businessId: string) => ['data', 'requests', businessId] as const,
    members: (businessId: string) => ['data', 'members', businessId] as const,
    timesheet: (businessId: string) => ['data', 'timesheet', businessId] as const,
    jobMedia: (jobId: string) => ['job-media', jobId] as const,
  },
  
  // Count-only queries for performance
  counts: {
    customers: (businessId: string) => ['counts', 'customers', businessId] as const,
    jobs: (businessId: string) => ['counts', 'jobs', businessId] as const,
    quotes: (businessId: string) => ['counts', 'quotes', businessId] as const,
    invoices: (businessId: string) => ['counts', 'invoices', businessId] as const,
    requests: (businessId: string) => ['counts', 'requests', businessId] as const,
  },
  
  // Billing and subscription
  billing: {
    stripeStatus: (businessId: string) => ['billing', 'stripe-status', businessId] as const,
    subscription: (userId: string) => ['billing', 'subscription', userId] as const,
  },
  
  // Dashboard queries
  dashboard: {
    summary: () => ['dashboard', 'summary'] as const,
    onboarding: () => ['dashboard', 'onboarding'] as const,
  },
  
} as const;

/**
 * Enhanced invalidation helpers with smart cross-entity invalidation
 */
const invalidationHelpers = {
  profile: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.current() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  },
  
  business: (queryClient: QueryClient) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.business.current() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.onboarding() });
  },
  
  // Smart invalidation for data entities - handles both count and full data
  customers: (queryClient: QueryClient, businessId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.counts.customers(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.data.customers(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  },
  
  jobs: (queryClient: QueryClient, businessId: string) => {
    console.log("[invalidationHelpers.jobs] Invalidating jobs for businessId:", businessId);
    queryClient.invalidateQueries({ queryKey: queryKeys.counts.jobs(businessId) });
    // Use pattern matching to invalidate both job queries (with and without userId)
    queryClient.invalidateQueries({ queryKey: ['data', 'jobs', businessId] });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
    // Cross-entity: jobs affect calendar view
    queryClient.invalidateQueries({ queryKey: ['calendar'] });
    // Invalidate job media queries
    queryClient.invalidateQueries({ queryKey: ['job-media'] });
  },
  
  quotes: (queryClient: QueryClient, businessId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.counts.quotes(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.data.quotes(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
    // Cross-entity: quotes can affect jobs
    queryClient.invalidateQueries({ queryKey: queryKeys.data.jobs(businessId) });
  },
  
  invoices: (queryClient: QueryClient, businessId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.counts.invoices(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.data.invoices(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
    // Cross-entity: invoices can affect jobs
    queryClient.invalidateQueries({ queryKey: queryKeys.data.jobs(businessId) });
    // Cross-entity: invoices can be linked to quotes, so refetch quotes too
    queryClient.invalidateQueries({ queryKey: queryKeys.data.quotes(businessId) });
  },
  
  requests: (queryClient: QueryClient, businessId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.counts.requests(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.data.requests(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  },
  
  timesheet: (queryClient: QueryClient, businessId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.data.timesheet(businessId) });
  },
  
  team: (queryClient: QueryClient, businessId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.data.members(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.team.invites(businessId) });
  },
  
  billing: (queryClient: QueryClient, businessId: string, userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.stripeStatus(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription(userId) });
  },
  
  all: (queryClient: QueryClient, businessId: string, userId: string) => {
    invalidationHelpers.profile(queryClient);
    invalidationHelpers.business(queryClient);
    invalidationHelpers.customers(queryClient, businessId);
    invalidationHelpers.jobs(queryClient, businessId);
    invalidationHelpers.quotes(queryClient, businessId);
    invalidationHelpers.invoices(queryClient, businessId);
    invalidationHelpers.requests(queryClient, businessId);
    invalidationHelpers.team(queryClient, businessId);
    invalidationHelpers.billing(queryClient, businessId, userId);
  }
};

// Export everything
export { queryKeys, invalidationHelpers };