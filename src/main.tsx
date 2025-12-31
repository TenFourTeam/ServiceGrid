import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n/config';
import { setBootStage, getBootState } from '@/lib/boot-trace';

function LoadingScreen({ label }: { label?: string }) {
  const bootState = getBootState();
  const displayLabel = label || bootState.stageLabel || 'Loading';
  
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div
          className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
          role="status"
          aria-label="Loading"
        />
        <span className="text-sm">{displayLabel}…</span>
      </div>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return <div style={{ padding: 24 }}>Auth configuration error: {message}</div>;
}

// Store root instance globally to persist across HMR updates
declare global {
  interface Window {
    __APP_ROOT__?: Root;
    __CLERK_KEY__?: string;
  }
}

const rootElement = document.getElementById('root')!;

// Get or create root - reuse existing root to prevent duplicate ClerkProviders
if (!window.__APP_ROOT__) {
  window.__APP_ROOT__ = createRoot(rootElement);
}

const root = window.__APP_ROOT__;

async function initializeApp() {
  // If we already have the Clerk key cached, use it immediately
  if (window.__CLERK_KEY__) {
    setBootStage('clerk_loading');
    root.render(<App clerkKey={window.__CLERK_KEY__} />);
    return;
  }

  // Show loading screen
  setBootStage('fetch_key_start');
  root.render(<LoadingScreen label="Fetching auth config" />);

  // Create abort controller with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

  try {
    const res = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/clerk-publishable-key', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      let msg = `Failed to load auth config (${res.status})`;
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

    setBootStage('fetch_key_ok');
    
    // Cache the key globally
    window.__CLERK_KEY__ = clerkKey;

    // Render app with Clerk key
    setBootStage('clerk_loading');
    root.render(<App clerkKey={clerkKey} />);
    
  } catch (error) {
    clearTimeout(timeoutId);
    const message = error instanceof Error ? error.message : 'Failed to load authentication configuration';
    
    if (error instanceof Error && error.name === 'AbortError') {
      setBootStage('fetch_key_fail', 'Auth config request timed out');
      root.render(<ErrorScreen message="Request timed out. Please check your connection and try again." />);
    } else {
      setBootStage('fetch_key_fail', message);
      root.render(<ErrorScreen message={message} />);
    }
  }
}

// Suppress DataCloneError from blocked tracking scripts on custom domain
window.addEventListener('error', (event) => {
  if (event.error?.name === 'DataCloneError' || 
      event.message?.includes('DataCloneError') ||
      event.message?.includes('cdn.gpteng.co')) {
    console.warn('Lovable tracking blocked on custom domain (expected)');
    event.preventDefault(); // Prevent error from propagating
    return true;
  }
});

// Also handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason?.name === 'DataCloneError' ||
      event.reason?.message?.includes('cdn.gpteng.co')) {
    console.warn('Lovable tracking promise rejected (expected on custom domain)');
    event.preventDefault();
  }
});

// Start initialization
initializeApp();

// Handle HMR (Hot Module Replacement) cleanup
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('[HMR] Module reloaded, re-rendering with cached key');
    initializeApp();
  });
}