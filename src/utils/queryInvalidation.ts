import { QueryClient } from "@tanstack/react-query";
import { qk } from "@/queries/keys";

/**
 * Centralized query invalidation helpers to ensure proper cache management
 * Call these after mutations to update both list and count queries
 */

export function invalidateCustomers(queryClient: QueryClient, businessId: string) {
  queryClient.invalidateQueries({ queryKey: qk.customersList(businessId) });
  queryClient.invalidateQueries({ queryKey: qk.customersCount(businessId) });
}

export function invalidateJobs(queryClient: QueryClient, businessId: string) {
  queryClient.invalidateQueries({ queryKey: qk.jobsList(businessId) });
  queryClient.invalidateQueries({ queryKey: qk.jobsCount(businessId) });
}

export function invalidateQuotes(queryClient: QueryClient, businessId: string) {
  queryClient.invalidateQueries({ queryKey: qk.quotesList(businessId) });
  queryClient.invalidateQueries({ queryKey: qk.quotesCount(businessId) });
}

export function invalidateInvoices(queryClient: QueryClient, businessId: string) {
  queryClient.invalidateQueries({ queryKey: qk.invoicesList(businessId) });
  queryClient.invalidateQueries({ queryKey: qk.invoicesCount(businessId) });
}

export function invalidateProfile(queryClient: QueryClient, userId: string) {
  queryClient.invalidateQueries({ queryKey: qk.profile(userId) });
}

export function invalidateBusiness(queryClient: QueryClient, businessId: string) {
  queryClient.invalidateQueries({ queryKey: qk.business(businessId) });
}

export function invalidateBilling(queryClient: QueryClient, businessId: string, userId: string) {
  queryClient.invalidateQueries({ queryKey: qk.stripeStatus(businessId) });
  queryClient.invalidateQueries({ queryKey: qk.subscription(userId) });
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