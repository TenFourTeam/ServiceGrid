import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { ClerkRuntimeProvider } from './components/Auth/ClerkRuntime';
import App from './App';
import './index.css';

function Boot() {
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/clerk-publishable-key')
      .then(async (res) => {
        if (!res.ok) {
          let msg = 'Failed to load Clerk key';
          try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
          throw new Error(msg);
        }
        return res.json();
      })
      .then((data) => setKey(data.publishableKey || null))
      .catch((e) => setError(e.message || 'Failed to load Clerk key'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) return (
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
  if (error) return <div style={{ padding: 24 }}>Auth configuration error: {error}</div>;

  return (
    <ClerkProvider publishableKey={key!}>
      <ClerkRuntimeProvider hasClerk={!!key}>
        <App />
      </ClerkRuntimeProvider>
    </ClerkProvider>
  );
}

const root = document.getElementById('root')!;
createRoot(root).render(<Boot />);
