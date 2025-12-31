import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import App from './App';
import './index.css';
import './i18n/config';
import { setBootStage } from '@/lib/boot-trace';

// Store root instance globally to persist across HMR updates
declare global {
  interface Window {
    __APP_ROOT__?: Root;
  }
}

const rootElement = document.getElementById('root')!;

// Get or create root - reuse existing root to prevent duplicates during HMR
if (!window.__APP_ROOT__) {
  window.__APP_ROOT__ = createRoot(rootElement);
}

const root = window.__APP_ROOT__;

function renderApp() {
  setBootStage('init');
  root.render(<App />);
}

// Suppress DataCloneError from blocked tracking scripts on custom domain
window.addEventListener('error', (event) => {
  if (event.error?.name === 'DataCloneError' || 
      event.message?.includes('DataCloneError') ||
      event.message?.includes('cdn.gpteng.co')) {
    console.warn('Lovable tracking blocked on custom domain (expected)');
    event.preventDefault();
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

// Render the app immediately - no need to fetch Clerk key
renderApp();

// Handle HMR (Hot Module Replacement) cleanup
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log('[HMR] Module reloaded, re-rendering');
    renderApp();
  });
}
