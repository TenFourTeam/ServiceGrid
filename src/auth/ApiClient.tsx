import { useAuthSnapshot } from "./AuthKernel";

export interface ApiClientOptions {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private getAuthHeader: () => Promise<Record<string, string>>;
  private onAuthError: (status: number, once: boolean) => Promise<'retry' | 'fail'>;

  constructor(
    getAuthHeader: () => Promise<Record<string, string>>,
    onAuthError: (status: number, once: boolean) => Promise<'retry' | 'fail'>
  ) {
    this.getAuthHeader = getAuthHeader;
    this.onAuthError = onAuthError;
  }

  async request<T = any>(path: string, options: ApiClientOptions = {}, tried = false): Promise<ApiResponse<T>> {
    const { method = 'GET', body, headers = {}, timeout = 30000 } = options;

    try {
      // Get auth headers
      const authHeaders = await this.getAuthHeader();

      // Build full URL for Supabase edge function
      const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      const url = `${SUPABASE_URL}/functions/v1/${cleanPath}`;

      // Prepare request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...headers,
        },
        signal: controller.signal,
      };

      if (body && method !== 'GET') {
        requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, requestOptions);
      clearTimeout(timeoutId);

      // Handle auth errors with retry logic
      if (response.status === 401 && !tried) {
        const retryAction = await this.onAuthError(response.status, false);
        if (retryAction === 'retry') {
          return this.request<T>(path, options, true);
        }
      }

      // Handle other auth errors
      if (response.status === 401 && tried) {
        await this.onAuthError(response.status, true);
      }

      // Parse response
      let data;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      return {
        data: response.ok ? data : undefined,
        error: response.ok ? undefined : data?.error || `Request failed with status ${response.status}`,
        status: response.status,
      };

    } catch (error: any) {
      if (error.name === 'AbortError') {
        return {
          error: 'Request timeout',
          status: 408,
        };
      }

      return {
        error: error.message || 'Network error',
        status: 0,
      };
    }
  }

  // Convenience methods
  async get<T = any>(path: string, options?: Omit<ApiClientOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  async post<T = any>(path: string, body?: any, options?: Omit<ApiClientOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'POST', body });
  }

  async put<T = any>(path: string, body?: any, options?: Omit<ApiClientOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PUT', body });
  }

  async delete<T = any>(path: string, options?: Omit<ApiClientOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

// Hook to get configured API client
export function useApiClient() {
  const { snapshot, refreshAuth } = useAuthSnapshot();

  const getAuthHeader = async (): Promise<Record<string, string>> => {
    if (snapshot.token) {
      return { 
        Authorization: `Bearer ${snapshot.token}`,
        // Always include business context from auth snapshot
        ...(snapshot.businessId 
          ? { 'X-Business-Id': snapshot.businessId } 
          : {}
        )
      };
    }
    return {};
  };

  const onAuthError = async (status: number, once: boolean): Promise<'retry' | 'fail'> => {
    if (!once && status === 401) {
      try {
        console.log('[ApiClient] 401 error, attempting to refresh auth...');
        await refreshAuth();
        console.log('[ApiClient] Auth refresh successful, retrying request');
        return 'retry';
      } catch (error) {
        console.error('[ApiClient] Auth refresh failed:', error);
        return 'fail';
      }
    }
    return 'fail';
  };

  return new ApiClient(getAuthHeader, onAuthError);
}