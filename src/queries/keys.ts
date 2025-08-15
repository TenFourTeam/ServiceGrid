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
  
  // Legacy compatibility (will be removed in future iterations)
  legacy: {
    dashboardData: () => ['dashboard-data'] as const,
  }
} as const;

/**
 * Helper to invalidate related queries after mutations
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
  
  all: (queryClient: any) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.profile.current() });
    queryClient.invalidateQueries({ queryKey: queryKeys.business.current() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.summary() });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.onboarding() });
    queryClient.invalidateQueries({ queryKey: queryKeys.legacy.dashboardData() });
  }
};

// Export everything
export { queryKeys, invalidationHelpers };