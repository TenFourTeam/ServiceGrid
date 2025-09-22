/**
 * Type definitions for lifecycle email functions
 * Separated from implementation to avoid circular dependencies
 */

export interface AuthApiClient {
  invoke: (name: string, options: { body: Record<string, unknown> }) => Promise<{ data: any; error: any }>;
}

export interface LifecycleEmailData {
  userFullName?: string;
  userEmail?: string;
  businessName?: string;
  businessId?: string;
  userId?: string;
  signupDate?: string;
  lastLoginDate?: string;
}

export interface FeatureDiscoveryParams {
  feature: string;
  featureDescription: string;
  ctaUrl: string;
  ctaText: string;
  daysFromSignup?: number;
}

export interface EngagementParams {
  type: string;
  lastActivity?: string;
}