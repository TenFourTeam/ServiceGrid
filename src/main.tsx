import React from 'react';
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

const rootElement = document.getElementById('root')!;
const root = createRoot(rootElement);

// Fetch Clerk key at module level to avoid React state-driven re-renders
let hasStarted = false;

async function initializeApp() {
  // Prevent multiple initializations
  if (hasStarted) return;
  hasStarted = true;

  // Show loading screen immediately
  root.render(<LoadingScreen />);

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
    const clerkKey = data.publishableKey;
    
    if (!clerkKey) {
      throw new Error('Missing authentication configuration');
    }

    // Render app with Clerk key - this happens only once
    root.render(<App clerkKey={clerkKey} />);
    
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load authentication configuration';
    root.render(<ErrorScreen message={message} />);
  }
}

// Start initialization
initializeApp();