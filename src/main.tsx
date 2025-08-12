
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { ClerkRuntimeProvider } from './components/Auth/ClerkRuntime';
import App from './App';
import './index.css';

const PUBLISHABLE_KEY = 'pk_test_ZGl2aW5lLWNvdy0yMy5jbGVyay5hY2NvdW50cy5kZXYk';

const root = document.getElementById('root')!;

createRoot(root).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
    <ClerkRuntimeProvider hasClerk={true}>
      <App />
    </ClerkRuntimeProvider>
  </ClerkProvider>
);
