/**
 * Centralized query key factory to prevent cache fragmentation
 * All query keys should be created through this module
 */

const queryKeys = {
  // Profile queries
  profile: {
    current: () => ['profile', 'current'] as const,
    byId: (id: string) => ['profile', id] as const,
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
  },
  
  // Data count queries  
  counts: {
    customers: (businessId: string) => ['counts', 'customers', businessId] as const,
    jobs: (businessId: string) => ['counts', 'jobs', businessId] as const,
    quotes: (businessId: string) => ['counts', 'quotes', businessId] as const,
    invoices: (businessId: string) => ['counts', 'invoices', businessId] as const,
  },
  
  // Billing and subscription
  billing: {
    stripeStatus: (businessId: string) => ['billing', 'stripe-status', businessId] as const,
    subscription: (userId: string) => ['billing', 'subscription', userId] as const,
  },
  
  // Dashboard and onboarding
  dashboard: {
    summary: () => ['dashboard', 'summary'] as const,
    onboarding: () => ['dashboard', 'onboarding'] as const,
  },
  
} as const;

/**
 * Enhanced invalidation helpers for all data types
 * Smart invalidation that handles both count and full data queries
 */
const invalidationHelpers = {
  profile: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.current() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.onboarding() });
  },
  
  business: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.business.current() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.onboarding() });
  },
  
  // Smart invalidation for data entities - handles both count and full queries
  customers: (queryClient: any, businessId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.counts.customers(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.counts.customers(businessId).concat(['full']) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  },
  
  jobs: (queryClient: any, businessId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.counts.jobs(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.counts.jobs(businessId).concat(['full']) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  },
  
  quotes: (queryClient: any, businessId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.counts.quotes(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.counts.quotes(businessId).concat(['full']) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  },
  
  invoices: (queryClient: any, businessId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.counts.invoices(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.counts.invoices(businessId).concat(['full']) });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
  },
  
  team: (queryClient: any, businessId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.team.members(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.team.invites(businessId) });
  },
  
  billing: (queryClient: any, businessId: string, userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.stripeStatus(businessId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription(userId) });
  },
  
  all: (queryClient: any, businessId: string, userId: string) => {
    invalidationHelpers.profile(queryClient);
    invalidationHelpers.business(queryClient);
    invalidationHelpers.customers(queryClient, businessId);
    invalidationHelpers.jobs(queryClient, businessId);
    invalidationHelpers.quotes(queryClient, businessId);
    invalidationHelpers.invoices(queryClient, businessId);
    invalidationHelpers.team(queryClient, businessId);
    invalidationHelpers.billing(queryClient, businessId, userId);
  }
};

// Export everything
export { queryKeys, invalidationHelpers };