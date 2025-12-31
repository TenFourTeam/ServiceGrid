/**
 * Boot Trace System
 * Tracks application boot stages for debugging loading issues
 */

export type BootStage = 
  | 'init'
  | 'fetch_key_start'
  | 'fetch_key_ok'
  | 'fetch_key_fail'
  | 'clerk_loading'
  | 'clerk_loaded'
  | 'providers_init'
  | 'auth_checking'
  | 'auth_redirect'
  | 'route_loading'
  | 'app_ready'
  | 'error';

export interface BootState {
  stage: BootStage;
  stageLabel: string;
  startTime: number;
  stageTime: number;
  error: string | null;
  history: Array<{ stage: BootStage; time: number; label: string }>;
}

const STAGE_LABELS: Record<BootStage, string> = {
  init: 'Initializing',
  fetch_key_start: 'Fetching auth config',
  fetch_key_ok: 'Auth config loaded',
  fetch_key_fail: 'Auth config failed',
  clerk_loading: 'Initializing authentication',
  clerk_loaded: 'Authentication ready',
  providers_init: 'Loading app providers',
  auth_checking: 'Checking session',
  auth_redirect: 'Redirecting',
  route_loading: 'Loading page',
  app_ready: 'Ready',
  error: 'Error occurred',
};

// Global boot state
const bootState: BootState = {
  stage: 'init',
  stageLabel: STAGE_LABELS.init,
  startTime: Date.now(),
  stageTime: Date.now(),
  error: null,
  history: [{ stage: 'init', time: Date.now(), label: STAGE_LABELS.init }],
};

// Expose globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__BOOT__ = bootState;
}

// Listeners for state changes
type BootListener = (state: BootState) => void;
const listeners = new Set<BootListener>();

export function setBootStage(stage: BootStage, error?: string): void {
  const now = Date.now();
  bootState.stage = stage;
  bootState.stageLabel = STAGE_LABELS[stage];
  bootState.stageTime = now;
  if (error) {
    bootState.error = error;
  }
  bootState.history.push({ stage, time: now, label: STAGE_LABELS[stage] });
  
  // Log for debugging
  const elapsed = now - bootState.startTime;
  console.log(`[Boot] ${STAGE_LABELS[stage]} (+${elapsed}ms)${error ? ` - ${error}` : ''}`);
  
  // Notify listeners
  listeners.forEach(listener => listener({ ...bootState }));
}

export function getBootState(): BootState {
  return { ...bootState };
}

export function subscribeToBootState(listener: BootListener): () => void {
  listeners.add(listener);
  // Immediately call with current state
  listener({ ...bootState });
  return () => listeners.delete(listener);
}

export function getBootDiagnostics(): string {
  const state = getBootState();
  const elapsed = Date.now() - state.startTime;
  const history = state.history
    .map(h => `${h.label} at +${h.time - state.startTime}ms`)
    .join('\n  ');
  
  return `Boot Diagnostics
================
Current Stage: ${state.stageLabel}
Total Time: ${elapsed}ms
Error: ${state.error || 'None'}
User Agent: ${navigator.userAgent}
URL: ${window.location.href}
Timestamp: ${new Date().toISOString()}

History:
  ${history}`;
}

export function clearAppCache(): void {
  // Clear localStorage keys related to app state
  const keysToRemove = Object.keys(localStorage).filter(key => 
    key.startsWith('ServiceGrid') || 
    key.startsWith('clerk') ||
    key.includes('supabase')
  );
  
  keysToRemove.forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn(`Failed to remove ${key}:`, e);
    }
  });
  
  // Clear cached Clerk key
  if (typeof window !== 'undefined') {
    delete (window as any).__CLERK_KEY__;
    delete (window as any).__APP_ROOT__;
  }
  
  console.log('[Boot] Cache cleared, reloading...');
  window.location.reload();
}

// Capture global errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    // Ignore DataCloneError from tracking scripts
    if (event.error?.name === 'DataCloneError' || 
        event.message?.includes('DataCloneError')) {
      return;
    }
    
    // Capture chunk loading errors
    if (event.message?.includes('Loading chunk') || 
        event.message?.includes('Failed to fetch dynamically imported module')) {
      setBootStage('error', `Chunk load failed: ${event.message}`);
      return;
    }
    
    // Log other errors during boot
    if (bootState.stage !== 'app_ready') {
      console.error('[Boot] Error during boot:', event.error || event.message);
    }
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    // Ignore tracking-related rejections
    if (event.reason?.message?.includes('cdn.gpteng.co')) {
      return;
    }
    
    // Log rejections during boot
    if (bootState.stage !== 'app_ready') {
      const message = event.reason?.message || String(event.reason);
      console.error('[Boot] Unhandled rejection during boot:', message);
    }
  });
}
