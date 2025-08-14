/**
 * Canonical query keys for consistent caching and invalidation
 * Every query should use these keys to avoid cache drift
 */
export const qk = {
  // User and business core data
  profile: (uid: string) => ['profile.current', uid] as const,
  business: (bid: string) => ['business.current', bid] as const,

  // Customer data (list and count)
  customersList: (bid: string) => ['customers.list', bid] as const,
  customersCount: (bid: string) => ['customers.count', bid] as const,

  // Job data (list and count)
  jobsList: (bid: string) => ['jobs.list', bid] as const,
  jobsCount: (bid: string) => ['jobs.count', bid] as const,

  // Quote data (list and count)
  quotesList: (bid: string) => ['quotes.list', bid] as const,
  quotesCount: (bid: string) => ['quotes.count', bid] as const,

  // Invoice data (list and count)
  invoicesList: (bid: string) => ['invoices.list', bid] as const,
  invoicesCount: (bid: string) => ['invoices.count', bid] as const,

  // Billing and subscription
  stripeStatus: (bid: string) => ['billing.stripeStatus', bid] as const,
  subscription: (uid: string) => ['billing.subscription', uid] as const,
} as const;