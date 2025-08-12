
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { ClerkRuntimeProvider } from './components/Auth/ClerkRuntime';
import App from './App';
import './index.css';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

const root = document.getElementById('root')!;

if (PUBLISHABLE_KEY) {
  createRoot(root).render(
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <ClerkRuntimeProvider hasClerk={true}>
        <App />
      </ClerkRuntimeProvider>
    </ClerkProvider>
  );
} else {
  console.error('Missing VITE_CLERK_PUBLISHABLE_KEY. Rendering without Clerk.');
  createRoot(root).render(
    <ClerkRuntimeProvider hasClerk={false}>
      <App />
    </ClerkRuntimeProvider>
  );
}
