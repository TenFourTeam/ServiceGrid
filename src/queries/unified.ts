/**
 * Unified query hooks - single source of truth for server state
 * All hooks return camelCase data, transforming at the query boundary
 */
import { useQuery } from '@tanstack/react-query';
import { useBusinessContext } from '@/auth';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { queryKeys } from './keys';
import { toBusinessUI, toProfileUI } from './transform';

// Business Query
export function useBusiness() {
  return useQuery({
    queryKey: queryKeys.business.current(),
    queryFn: async () => {
      console.info('[useBusiness] fetching business from database');
      const data = await edgeRequest(fn('get-business'));
      return toBusinessUI(data);
    },
    staleTime: 30_000,
    retry: 2,
  });
}

// Profile Query
export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.current(),
    queryFn: async () => {
      console.info('[useProfile] fetching profile from database');
      const data = await edgeRequest(fn('profile-get'));
      return toProfileUI(data);
    },
    staleTime: 30_000,
    retry: 2,
  });
}

// Count queries for performance
export function useCustomersCount() {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId;

  return useQuery({
    queryKey: queryKeys.counts.customers(businessId || ''),
    enabled,
    queryFn: async (): Promise<number> => {
      console.info("[useCustomersCount] fetching count...");
      const data = await edgeRequest(`${fn('customers')}?count=true`);
      return data?.count ?? 0;
    },
    staleTime: 30_000,
  });
}

export function useJobsCount() {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId;

  return useQuery({
    queryKey: queryKeys.counts.jobs(businessId || ''),
    enabled,
    queryFn: async (): Promise<number> => {
      console.info("[useJobsCount] fetching count...");
      const data = await edgeRequest(`${fn('jobs')}?count=true`);
      return data?.count ?? 0;
    },
    staleTime: 30_000,
  });
}

export function useQuotesCount() {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId;

  return useQuery({
    queryKey: queryKeys.counts.quotes(businessId || ''),
    enabled,
    queryFn: async (): Promise<number> => {
      console.info("[useQuotesCount] fetching count...");
      const data = await edgeRequest(`${fn('quotes')}?count=true`);
      return data?.count ?? 0;
    },
    staleTime: 30_000,
  });
}

export function useInvoicesCount() {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId;

  return useQuery({
    queryKey: queryKeys.counts.invoices(businessId || ''),
    enabled,
    queryFn: async (): Promise<number> => {
      console.info("[useInvoicesCount] fetching count...");
      const data = await edgeRequest(`${fn('invoices')}?count=true`);
      return data?.count ?? 0;
    },
    staleTime: 30_000,
  });
}

// Billing queries
export function useStripeConnectStatus() {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId;

  return useQuery({
    queryKey: queryKeys.billing.stripeStatus(businessId || ''),
    enabled,
    queryFn: async () => {
      const data = await edgeRequest(fn('connect-account-status'));
      return data;
    },
    staleTime: 60_000, // 1 minute for billing data
  });
}

export function useSubscriptionStatus() {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated;

  return useQuery({
    queryKey: queryKeys.billing.subscription(businessId || ''),
    enabled,
    queryFn: async () => {
      const data = await edgeRequest(fn('check-subscription'));
      return data;
    },
    staleTime: 60_000, // 1 minute for billing data
  });
}

// Full data queries (for pages that need complete data)
export function useCustomers() {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId;

  return useQuery({
    queryKey: queryKeys.counts.customers(businessId || '').concat(['full']),
    enabled,
    queryFn: async () => {
      console.info("[useCustomers] fetching customers data...");
      const data = await edgeRequest(fn('customers'));
      return data?.rows || [];
    },
    staleTime: 30_000,
  });
}

export function useJobs() {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId;

  return useQuery({
    queryKey: queryKeys.counts.jobs(businessId || '').concat(['full']),
    enabled,
    queryFn: async () => {
      console.info("[useJobs] fetching jobs data...");
      const data = await edgeRequest(fn('jobs'));
      return data?.rows || [];
    },
    staleTime: 30_000,
  });
}

export function useQuotes() {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId;

  return useQuery({
    queryKey: queryKeys.counts.quotes(businessId || '').concat(['full']),
    enabled,
    queryFn: async () => {
      console.info("[useQuotes] fetching quotes data...");
      const data = await edgeRequest(fn('quotes'));
      return data?.rows || [];
    },
    staleTime: 30_000,
  });
}

export function useInvoices() {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId;

  return useQuery({
    queryKey: queryKeys.counts.invoices(businessId || '').concat(['full']),
    enabled,
    queryFn: async () => {
      console.info("[useInvoices] fetching invoices data...");
      const data = await edgeRequest(fn('invoices'));
      return data?.rows || [];
    },
    staleTime: 30_000,
  });
}