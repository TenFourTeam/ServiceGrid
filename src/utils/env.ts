/**
 * Centralized environment variable handling for the application
 * Provides type-safe access to environment variables with proper fallbacks
 */

interface EnvironmentConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  clerkPublishableKey?: string;
  isDevelopment: boolean;
  isProduction: boolean;
  appUrl: string;
}

/**
 * Get the Supabase URL with fallback to production URL
 */
export function getSupabaseUrl(): string {
  return import.meta.env.VITE_SUPABASE_URL || 'https://ijudkzqfriazabiosnvb.supabase.co';
}

/**
 * Get the Supabase anon key with fallback to production key
 */
export function getSupabaseAnonKey(): string {
  return import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdWRrenFmcmlhemFiaW9zbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzIyNjAsImV4cCI6MjA3MDI0ODI2MH0.HLOwmgddlBTcHfYrX9RYvO8RK6IVkjDQvsdHyXuMXIM';
}

/**
 * Get the application base URL for generating links
 */
export function getAppUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return import.meta.env.VITE_APP_URL || 'https://app.servicegrid.ai';
}

/**
 * Get the Clerk publishable key
 */
export function getClerkPublishableKey(): string | undefined {
  return import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD;
}

/**
 * Build a Supabase Edge Function URL
 */
export function buildEdgeFunctionUrl(functionName: string, params?: Record<string, string>): string {
  const baseUrl = getSupabaseUrl();
  const url = new URL(`/functions/v1/${functionName}`, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }
  
  return url.toString();
}

/**
 * Get complete environment configuration
 */
export function getEnvironmentConfig(): EnvironmentConfig {
  return {
    supabaseUrl: getSupabaseUrl(),
    supabaseAnonKey: getSupabaseAnonKey(),
    clerkPublishableKey: getClerkPublishableKey(),
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    appUrl: getAppUrl(),
  };
}

/**
 * Legacy environment access (for backward compatibility)
 * @deprecated Use specific getter functions instead
 */
export const env = {
  get SUPABASE_URL() { return getSupabaseUrl(); },
  get SUPABASE_ANON_KEY() { return getSupabaseAnonKey(); },
  get CLERK_PUBLISHABLE_KEY() { return getClerkPublishableKey(); },
  get APP_URL() { return getAppUrl(); },
  get IS_DEV() { return isDevelopment(); },
  get IS_PROD() { return isProduction(); },
};