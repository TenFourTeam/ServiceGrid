import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n/config';

function LoadingScreen() {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex items-center gap-3 text-muted-foreground">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
          role="status"
          aria-label="Loading"
        />
        <span className="text-sm">Loading…</span>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return <div style={{ padding: 24 }}>Auth configuration error: {message}</div>;
}

function Boot() {
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  console.log('[Boot] Rendering with state:', { key: key ? 'present' : 'null', error, isLoading });

  useEffect(() => {
    let mounted = true; // Prevent state updates if component unmounts
    
    console.log('[Boot] useEffect triggered, fetching clerk key');
    fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/clerk-publishable-key')
      .then(async (res) => {
        if (!res.ok) {
          let msg = 'Failed to load Clerk key';
          try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
          throw new Error(msg);
        }
        return res.json();
      })
      .then((data) => {
        console.log('[Boot] Got clerk key successfully');
        if (mounted) {
          setKey(data.publishableKey || null);
        }
      })
      .catch((e) => {
        console.error('[Boot] Error fetching clerk key:', e);
        if (mounted) {
          setError(e.message || 'Failed to load Clerk key');
        }
      })
      .finally(() => {
        console.log('[Boot] Finished loading');
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (isLoading) {
    console.log('[Boot] Showing loading screen');
    return <LoadingScreen />;
  }

  if (error) {
    console.log('[Boot] Showing error screen:', error);
    return <ErrorScreen message={error} />;
  }

  if (!key) {
    console.log('[Boot] No key found, showing config error');
    return <ErrorScreen message="Missing authentication configuration" />;
  }

  console.log('[Boot] Rendering App component');
  return <App clerkKey={key} />;
}

const root = document.getElementById('root')!;
createRoot(root).render(<Boot />);