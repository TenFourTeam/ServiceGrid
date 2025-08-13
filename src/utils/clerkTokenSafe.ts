// Safe Clerk token retrieval with fallback
// Tries named template first, falls back to default token

declare global {
  interface Window {
    Clerk?: {
      session?: {
        getToken: (options?: { template?: string; refresh?: boolean }) => Promise<string | null>;
      };
    };
  }
}

export async function getApiToken(opts?: { refresh?: boolean }): Promise<string | null> {
  try {
    // Try the named template first
    const templateToken = await window.Clerk?.session?.getToken({ 
      template: 'supabase', 
      refresh: opts?.refresh 
    });
    if (templateToken) {
      console.debug('[ClerkToken] Using template token');
      return templateToken;
    }
  } catch (error) {
    console.debug('[ClerkToken] Template token failed, falling back to default:', error);
  }
  
  // Fallback to default token
  try {
    const defaultToken = await window.Clerk?.session?.getToken({ 
      refresh: opts?.refresh 
    });
    if (defaultToken) {
      console.debug('[ClerkToken] Using default token');
      return defaultToken;
    }
  } catch (error) {
    console.warn('[ClerkToken] All token methods failed:', error);
  }
  
  return null;
}