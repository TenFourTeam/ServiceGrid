/**
 * Utility functions for subdomain-based business URLs
 */

export function generateBusinessSubdomainUrl(businessSlug: string, baseUrl?: string): string {
  if (!businessSlug) return window.location.origin;
  
  const currentUrl = new URL(baseUrl || window.location.origin);
  const hostname = currentUrl.hostname;
  
  // Handle localhost development
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return `${currentUrl.protocol}//${hostname}:${currentUrl.port}/b/${businessSlug}`;
  }
  
  // Production: use subdomain
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    const domain = parts.slice(-2).join('.');
    return `${currentUrl.protocol}//${businessSlug}.${domain}`;
  }
  
  return `${currentUrl.protocol}//${businessSlug}.${hostname}`;
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