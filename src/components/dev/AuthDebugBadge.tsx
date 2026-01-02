import { useAuth } from '@/hooks/useBusinessAuth';
import { useBusinessContext } from '@/hooks/useBusinessContext';

/**
 * Development-only component that displays current auth and business context state.
 * Helps diagnose origin-related session persistence issues and auth state problems.
 * Only renders in development mode or when ?debug=auth query param is present.
 */
export function AuthDebugBadge() {
  const { isLoaded, isSignedIn, session } = useAuth();
  const { businessId, role, isLoadingBusiness } = useBusinessContext();

  // Only show in dev mode or with debug query param
  const showDebug = import.meta.env.DEV || 
    (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === 'auth');

  if (!showDebug) return null;

  const hasToken = !!session?.access_token;
  const origin = typeof window !== 'undefined' ? window.location.origin : 'unknown';

  return (
    <div className="fixed bottom-4 left-4 z-[9999] bg-background/95 border border-border rounded-lg p-3 text-xs font-mono shadow-lg max-w-xs">
      <div className="font-semibold mb-2 text-foreground">Auth Debug</div>
      <div className="space-y-1 text-muted-foreground">
        <div className="truncate" title={origin}>
          <span className="text-foreground">origin:</span> {origin.replace('https://', '')}
        </div>
        <div>
          <span className="text-foreground">isLoaded:</span>{' '}
          <span className={isLoaded ? 'text-green-500' : 'text-yellow-500'}>
            {String(isLoaded)}
          </span>
        </div>
        <div>
          <span className="text-foreground">isSignedIn:</span>{' '}
          <span className={isSignedIn ? 'text-green-500' : 'text-red-500'}>
            {String(isSignedIn)}
          </span>
        </div>
        <div>
          <span className="text-foreground">hasToken:</span>{' '}
          <span className={hasToken ? 'text-green-500' : 'text-red-500'}>
            {String(hasToken)}
          </span>
        </div>
        <div>
          <span className="text-foreground">businessLoading:</span>{' '}
          <span className={isLoadingBusiness ? 'text-yellow-500' : 'text-green-500'}>
            {String(isLoadingBusiness)}
          </span>
        </div>
        <div className="truncate" title={businessId || 'null'}>
          <span className="text-foreground">businessId:</span>{' '}
          <span className={businessId ? 'text-green-500' : 'text-red-500'}>
            {businessId ? businessId.slice(0, 8) + '...' : 'null'}
          </span>
        </div>
        <div>
          <span className="text-foreground">role:</span>{' '}
          <span className={role ? 'text-green-500' : 'text-muted-foreground'}>
            {role || 'null'}
          </span>
        </div>
      </div>
    </div>
  );
}
