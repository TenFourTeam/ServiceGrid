import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BrowserRouter } from 'react-router-dom';
import { ConsolidatedToaster } from '@/components/ui/toast-consolidated';
import { UIStoreProvider } from '@/store/ui';

// Simple query client with basic defaults
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

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Minimal provider hierarchy: QueryClient → Tooltip → Router → UI
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={100}>
        <ConsolidatedToaster />
        <BrowserRouter>
          <UIStoreProvider>
            {children}
          </UIStoreProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export { queryClient };