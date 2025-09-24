import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConsolidatedToaster } from '@/components/ui/toaster';
import { LanguageProvider } from '@/contexts/LanguageContext';

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
 * Minimal provider hierarchy: QueryClient → Tooltip
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider delayDuration={100}>
          <ConsolidatedToaster />
          {children}
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export { queryClient };