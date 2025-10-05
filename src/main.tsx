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
  const [state, setState] = useState<{
    key: string | null;
    error: string | null;
    isLoading: boolean;
  }>({
    key: null,
    error: null,
    isLoading: true
  });

  useEffect(() => {
    let mounted = true;
    let hasRun = false; // Prevent multiple runs
    
    const fetchClerkKey = async () => {
      if (hasRun) return; // Prevent duplicate calls
      hasRun = true;
      
      try {
        const res = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/clerk-publishable-key');
        
        if (!res.ok) {
          let msg = 'Failed to load Clerk key';
          try { 
            const j = await res.json(); 
            if (j?.error) msg = j.error; 
          } catch {}
          throw new Error(msg);
        }
        
        const data = await res.json();
        const fetchedKey = data.publishableKey;
        
        if (!fetchedKey) {
          throw new Error('Missing authentication configuration');
        }
        
        if (mounted) {
          setState(prev => {
            // Only update if we don't already have a key
            if (prev.key) return prev;
            return { key: fetchedKey, error: null, isLoading: false };
          });
        }
      } catch (e: Error | unknown) {
        if (mounted) {
          setState(prev => {
            // Only update if we don't already have a key or error
            if (prev.key || prev.error) return prev;
            return { key: null, error: (e instanceof Error ? e.message : null) || 'Failed to load Clerk key', isLoading: false };
          });
        }
      }
    };

    fetchClerkKey();

    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array ensures this runs only once

  if (state.isLoading) {
    return <LoadingScreen />;
  }

  if (state.error) {
    return <ErrorScreen message={state.error} />;
  }

  if (!state.key) {
    return <ErrorScreen message="Missing authentication configuration" />;
  }

  return <App clerkKey={state.key} />;
}

const rootElement = document.getElementById('root')!;

// Use a global flag to prevent multiple root creations during HMR
if (!(window as any).__root__) {
  (window as any).__root__ = createRoot(rootElement);
}

(window as any).__root__.render(<Boot />);