import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ConsolidatedToaster } from '@/components/ui/toaster';
import { LanguageProvider } from '@/contexts/LanguageContext';

// Simple query client with basic defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // 30 seconds for mobile
      gcTime: 5 * 60 * 1000, // 5 minutes (mobile has less memory)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // Better mobile network handling
      retry: (failureCount, error: any) => {
        // Don't retry on auth or CORS errors
        if (error?.status === 401 || error?.message?.includes('401')) return false;
        if (error?.message?.includes('CORS')) return false;
        return failureCount < 2;
      },
      networkMode: 'online',
    },
    mutations: {
      retry: 1,
      networkMode: 'online',
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