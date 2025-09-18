import React, { useEffect, useState, useRef } from 'react';
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

// Global state to prevent multiple concurrent fetches and multiple App instances
let clerkKeyCache: string | null = null;
let isInitializing = false;
let appInstanceRef: React.ComponentType<{ clerkKey: string }> | null = null;

function Boot() {
  const [key, setKey] = useState<string | null>(clerkKeyCache);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!clerkKeyCache);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // If we already have a cached key and we're mounted, use it immediately
    if (clerkKeyCache && mountedRef.current) {
      setKey(clerkKeyCache);
      setIsLoading(false);
      return;
    }

    // If we're already initializing, don't start another fetch
    if (isInitializing) {
      return;
    }

    isInitializing = true;
    
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
        
        if (mountedRef.current) {
          clerkKeyCache = fetchedKey;
          setKey(fetchedKey);
          setIsLoading(false);
        }
      } catch (e: any) {
        if (mountedRef.current) {
          setError(e.message || 'Failed to load Clerk key');
          setIsLoading(false);
        }
      } finally {
        isInitializing = false;
      }
    };

    fetchClerkKey();
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

  // Ensure we only create one App instance
  if (!appInstanceRef) {
    appInstanceRef = App;
  }

  const AppComponent = appInstanceRef;
  return <AppComponent clerkKey={key} />;
}

const root = document.getElementById('root')!;
createRoot(root).render(<Boot />);