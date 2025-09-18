/**
 * Utility functions for generating cache-busted shareable URLs
 * Ensures fresh meta tags for social media platforms
 */

export function generateCacheBustedUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  const timestamp = Math.floor(Date.now() / 1000);
  url.searchParams.set('cb', timestamp.toString());
  return url.toString();
}

export function getCurrentCacheBuster(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('cb');
}

export function hasCacheBuster(): boolean {
  return getCurrentCacheBuster() !== null;
}

export function appendCacheBusterToImageUrl(imageUrl: string): string {
  if (!imageUrl) return imageUrl;
  
  const cacheBuster = getCurrentCacheBuster();
  if (!cacheBuster) return imageUrl;
  
  const url = new URL(imageUrl, window.location.origin);
  url.searchParams.set('cb', cacheBuster);
  return url.toString();
}