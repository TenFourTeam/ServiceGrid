
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ClerkLoaded, ClerkLoading } from '@clerk/clerk-react';
import { BrowserRouter } from 'react-router-dom';
import { AuthKernel } from '@/auth/AuthKernel';
import AuthErrorBoundary from '@/auth/AuthErrorBoundary';
import { QueryClientIntegration } from '@/auth/QueryClientIntegration';
import { ConsolidatedToaster } from '@/components/ui/toast-consolidated';
import { UIStoreProvider } from '@/store/ui';
import LoadingScreen from '@/components/LoadingScreen';

// Query client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000, // 15 seconds
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on auth errors
        if (error?.status === 401 || error?.message?.includes('401')) return false;
        return failureCount < 2;
      }
    },
    mutations: {
      retry: 1,
    }
  }
});

// Add React Query Devtools for development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Simplified provider hierarchy - maximum 4 levels:
 * QueryClient → Tooltip → Clerk → Auth → Router
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={100}>
        <ConsolidatedToaster />
        <ClerkLoaded>
          <AuthKernel>
            <AuthErrorBoundary>
              <QueryClientIntegration />
              <BrowserRouter>
                <UIStoreProvider>
                  {children}
                </UIStoreProvider>
              </BrowserRouter>
            </AuthErrorBoundary>
          </AuthKernel>
        </ClerkLoaded>
        <ClerkLoading>
          <LoadingScreen full />
        </ClerkLoading>
        {/* DevTools only in development */}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export { queryClient };
