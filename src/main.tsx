import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.tsx'
import './index.css'
import LoadingScreen from '@/components/LoadingScreen'

const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";

function Root() {
  const [pk, setPk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/clerk-publishable-key`);
        if (!r.ok) throw new Error(`Failed to fetch Clerk key (${r.status})`);
        const data = await r.json();
        if (!data.publishableKey) throw new Error('No publishableKey in response');
        if (!cancelled) setPk(data.publishableKey);
      } catch (e: any) {
        console.error('[main] Clerk key error:', e);
        if (!cancelled) setError(e.message || String(e));
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (!pk && !error) {
    return <LoadingScreen />;
  }

  if (pk) {
    return (
      <ClerkProvider publishableKey={pk}>
        <App />
      </ClerkProvider>
    );
  }

  // Error: show message to user
  return (
    <div className="min-h-screen grid place-items-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">Unable to load authentication</h1>
        <p className="mt-2 text-sm text-muted-foreground">Failed to fetch Clerk publishable key. Please refresh or try again later.</p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Root />);
