/**
 * Unified query hooks - single source of truth for server state
 * All hooks return camelCase data, transforming at the query boundary
 */
import { useQuery } from '@tanstack/react-query';
import { useAuthSnapshot, useApiClient } from '@/auth';
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
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const enabled = snapshot.phase === 'authenticated' && !!snapshot.businessId;

  return useQuery({
    queryKey: queryKeys.counts.customers(snapshot.businessId || ''),
    enabled,
    queryFn: async (): Promise<number> => {
      console.info("[useCustomersCount] fetching count...");
      const response = await apiClient.get("/customers?count=true");
      if (response.error) throw new Error(response.error);
      return response.data?.count ?? 0;
    },
    staleTime: 30_000,
  });
}

export function useJobsCount() {
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const enabled = snapshot.phase === 'authenticated' && !!snapshot.businessId;

  return useQuery({
    queryKey: queryKeys.counts.jobs(snapshot.businessId || ''),
    enabled,
    queryFn: async (): Promise<number> => {
      console.info("[useJobsCount] fetching count...");
      const response = await apiClient.get("/jobs?count=true");
      if (response.error) throw new Error(response.error);
      return response.data?.count ?? 0;
    },
    staleTime: 30_000,
  });
}

export function useQuotesCount() {
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const enabled = snapshot.phase === 'authenticated' && !!snapshot.businessId;

  return useQuery({
    queryKey: queryKeys.counts.quotes(snapshot.businessId || ''),
    enabled,
    queryFn: async (): Promise<number> => {
      console.info("[useQuotesCount] fetching count...");
      const response = await apiClient.get("/quotes?count=true");
      if (response.error) throw new Error(response.error);
      return response.data?.count ?? 0;
    },
    staleTime: 30_000,
  });
}

export function useInvoicesCount() {
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const enabled = snapshot.phase === 'authenticated' && !!snapshot.businessId;

  return useQuery({
    queryKey: queryKeys.counts.invoices(snapshot.businessId || ''),
    enabled,
    queryFn: async (): Promise<number> => {
      console.info("[useInvoicesCount] fetching count...");
      const response = await apiClient.get("/invoices?count=true");
      if (response.error) throw new Error(response.error);
      return response.data?.count ?? 0;
    },
    staleTime: 30_000,
  });
}

// Billing queries
export function useStripeConnectStatus() {
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const enabled = snapshot.phase === 'authenticated' && !!snapshot.businessId;

  return useQuery({
    queryKey: queryKeys.billing.stripeStatus(snapshot.businessId || ''),
    enabled,
    queryFn: async () => {
      const response = await apiClient.get("/connect-account-status");
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    staleTime: 60_000, // 1 minute for billing data
  });
}

export function useSubscriptionStatus() {
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const enabled = snapshot.phase === 'authenticated';

  return useQuery({
    queryKey: queryKeys.billing.subscription(snapshot.businessId || ''),
    enabled,
    queryFn: async () => {
      const response = await apiClient.get("/check-subscription");
      if (response.error) throw new Error(response.error);
      return response.data;
    },
    staleTime: 60_000, // 1 minute for billing data
  });
}

// Full data queries (for pages that need complete data)
export function useCustomers() {
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const enabled = snapshot.phase === 'authenticated' && !!snapshot.businessId;

  return useQuery({
    queryKey: queryKeys.counts.customers(snapshot.businessId || '').concat(['full']),
    enabled,
    queryFn: async () => {
      console.info("[useCustomers] fetching customers data...");
      const response = await apiClient.get("/customers");
      if (response.error) throw new Error(response.error);
      return response.data?.rows || [];
    },
    staleTime: 30_000,
  });
}

export function useJobs() {
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const enabled = snapshot.phase === 'authenticated' && !!snapshot.businessId;

  return useQuery({
    queryKey: queryKeys.counts.jobs(snapshot.businessId || '').concat(['full']),
    enabled,
    queryFn: async () => {
      console.info("[useJobs] fetching jobs data...");
      const response = await apiClient.get("/jobs");
      if (response.error) throw new Error(response.error);
      return response.data?.rows || [];
    },
    staleTime: 30_000,
  });
}

export function useQuotes() {
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const enabled = snapshot.phase === 'authenticated' && !!snapshot.businessId;

  return useQuery({
    queryKey: queryKeys.counts.quotes(snapshot.businessId || '').concat(['full']),
    enabled,
    queryFn: async () => {
      console.info("[useQuotes] fetching quotes data...");
      const response = await apiClient.get("/quotes");
      if (response.error) throw new Error(response.error);
      return response.data?.rows || [];
    },
    staleTime: 30_000,
  });
}

export function useInvoices() {
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const enabled = snapshot.phase === 'authenticated' && !!snapshot.businessId;

  return useQuery({
    queryKey: queryKeys.counts.invoices(snapshot.businessId || '').concat(['full']),
    enabled,
    queryFn: async () => {
      console.info("[useInvoices] fetching invoices data...");
      const response = await apiClient.get("/invoices");
      if (response.error) throw new Error(response.error);
      return response.data?.rows || [];
    },
    staleTime: 30_000,
  });
}