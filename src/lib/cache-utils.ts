/**
 * Cache utilities for app state management
 */

export function clearAppCache(): void {
  // Clear localStorage keys related to app state
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.startsWith('ServiceGrid') || 
    key.includes('supabase')
  );
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to remove ${key}:`, e);
    }
  });
  
  console.log('[Cache] Cleared, reloading...');
  window.location.reload();
}
