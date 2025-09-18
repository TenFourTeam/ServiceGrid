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

// Global state to prevent multiple concurrent fetches
let clerkKeyCache: string | null = null;

function Boot() {
  const [key, setKey] = useState<string | null>(clerkKeyCache);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!clerkKeyCache);

  useEffect(() => {
    // If we already have a cached key, don't fetch again
    if (clerkKeyCache) {
      return;
    }

    let isMounted = true;
    
    const fetchClerkKey = async () => {
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
        
        if (isMounted) {
          clerkKeyCache = fetchedKey;
          setKey(fetchedKey);
          setIsLoading(false);
        }
      } catch (e: any) {
        if (isMounted) {
          setError(e.message || 'Failed to load Clerk key');
          setIsLoading(false);
        }
      }
    };

    fetchClerkKey();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  if (!key) {
    return <ErrorScreen message="Missing authentication configuration" />;
  }

  return <App key={key} clerkKey={key} />;
}

const root = document.getElementById('root')!;
createRoot(root).render(<Boot />);