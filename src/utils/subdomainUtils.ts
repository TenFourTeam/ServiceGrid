/**
 * Utility functions for subdomain-based business URLs
 */

import { getAppUrl, isDevelopment } from './env';

export function generateBusinessSubdomainUrl(businessSlug: string, baseUrl?: string): string {
  if (!businessSlug) return getAppUrl();
  
  // Use provided baseUrl or determine based on environment
  const targetUrl = baseUrl || getAppUrl();
  const currentUrl = new URL(targetUrl);
  const hostname = currentUrl.hostname;
  
  // Handle localhost development
  if (isDevelopment() && (hostname.includes('localhost') || hostname.includes('127.0.0.1'))) {
    return `${currentUrl.protocol}//${hostname}:${currentUrl.port}/b/${businessSlug}`;
  }
  
  // Production: use subdomain with servicegrid.app
  return `https://${businessSlug}.servicegrid.app`;
}

export function getCurrentBusinessSlug(): string | null {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  
  // Skip localhost and common subdomains
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return null;
  }
  
  const subdomain = hostname.split('.')[0];
  if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
    return subdomain;
  }
  
  return null;
}

export function isSubdomainUrl(): boolean {
  return getCurrentBusinessSlug() !== null;
}

export function generateRequestFormUrl(businessSlug: string): string {
  const baseUrl = generateBusinessSubdomainUrl(businessSlug);
  return `${baseUrl}/request`;
}