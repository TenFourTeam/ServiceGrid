import React, { useEffect, useRef } from 'react';
import { useAuth, useSession } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { useProfileSafe } from '@/queries/useProfileSafe';
import { useBusinessSafe } from '@/queries/useBusinessSafe';
import LoadingScreen from '@/components/LoadingScreen';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Simple bootstrap gate - runs once per session when profile/business missing
 */
export function AppShell({ children }: AppShellProps) {
  const { isSignedIn, getToken } = useAuth();
  const { session } = useSession();
  const { data: profile } = useProfileSafe();
  const { data: business } = useBusinessSafe();
  const queryClient = useQueryClient();
  const ranRef = useRef<string | null>(null);

  const needsBootstrap = isSignedIn && (!profile || !business);
  
  useEffect(() => {
    if (!needsBootstrap) return;
    
    const runKey = session?.id || 'no-session';
    if (ranRef.current === runKey) return; // run once per session
    ranRef.current = runKey;

    console.log('[bootstrap] Starting for session:', runKey);

    (async () => {
      try {
        const token = await getToken({ template: 'supabase' }).catch(() => getToken());
        if (!token) throw new Error('No Clerk token');

        const res = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/clerk-bootstrap`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        });
        
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body?.error?.message || `Bootstrap failed: ${res.status}`);
        }

        console.log('[bootstrap] Success:', body);

        // Invalidate queries to refetch profile and business
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['profile', 'current'] }),
          queryClient.invalidateQueries({ queryKey: ['business', 'current'] }),
        ]);
      } catch (error) {
        console.error('[bootstrap] Failed:', error);
        // Reset to allow retry on next load
        ranRef.current = null;
      }
    })();
  }, [needsBootstrap, getToken, session?.id, queryClient]);

  if (needsBootstrap) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
            role="status"
            aria-label="Loading"
          />
          <span className="text-sm">Setting up your account…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}