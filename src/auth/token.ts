// Simplified Clerk token helper - uses default token only
// No JWT templates required

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: (options?: { refresh?: boolean }) => Promise<string | null>;
      };
    };
  }
}

/**
 * Gets the default Clerk token with retry logic
 * No template parameter - uses Clerk's standard session token
 */
export async function getApiToken(opts?: { refresh?: boolean; attempts?: number }): Promise<string | null> {
  const attempts = Math.max(1, opts?.attempts ?? 3);
  let lastError: any = null;

  for (let i = 0; i < attempts; i++) {
    try {
      const token = await window.Clerk?.session?.getToken({ 
        refresh: opts?.refresh 
      });
      
      if (token) {
        console.debug('[Token] Successfully retrieved Clerk default token');
        return token;
      }
    } catch (error) {
      lastError = error;
      console.debug(`[Token] Attempt ${i + 1}/${attempts} failed:`, error);
    }
    
    // Short delay between retries
    if (i < attempts - 1) {
      await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
    }
  }

  console.warn('[Token] All attempts failed:', lastError);
  return null;
}

/**
 * Gets token with error throwing for cases where token is required
 */
export async function getApiTokenStrict(opts?: { refresh?: boolean; attempts?: number }): Promise<string> {
  const token = await getApiToken(opts);
  if (!token) {
    throw new Error('Failed to obtain authentication token');
  }
  return token;
}