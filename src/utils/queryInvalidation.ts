import { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/queries/keys";

/**
 * Centralized query invalidation helpers to ensure proper cache management
 * Call these after mutations to update both list and count queries
 */

export function invalidateCustomers(queryClient: QueryClient, businessId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.counts.customers(businessId).concat(['full']) });
  queryClient.invalidateQueries({ queryKey: queryKeys.counts.customers(businessId) });
}

export function invalidateJobs(queryClient: QueryClient, businessId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.counts.jobs(businessId).concat(['full']) });
  queryClient.invalidateQueries({ queryKey: queryKeys.counts.jobs(businessId) });
}

export function invalidateQuotes(queryClient: QueryClient, businessId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.counts.quotes(businessId).concat(['full']) });
  queryClient.invalidateQueries({ queryKey: queryKeys.counts.quotes(businessId) });
}

export function invalidateInvoices(queryClient: QueryClient, businessId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.counts.invoices(businessId).concat(['full']) });
  queryClient.invalidateQueries({ queryKey: queryKeys.counts.invoices(businessId) });
}

export function invalidateProfile(queryClient: QueryClient, userId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.profile.current() });
}

export function invalidateBusiness(queryClient: QueryClient, businessId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.business.current() });
}

export function invalidateBilling(queryClient: QueryClient, businessId: string, userId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.billing.stripeStatus(businessId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription(userId) });
}

export function invalidateAll(queryClient: QueryClient, businessId: string, userId: string) {
  invalidateCustomers(queryClient, businessId);
  invalidateJobs(queryClient, businessId);
  invalidateQuotes(queryClient, businessId);
  invalidateInvoices(queryClient, businessId);
  invalidateProfile(queryClient, userId);
  invalidateBusiness(queryClient, businessId);
  invalidateBilling(queryClient, businessId, userId);
}