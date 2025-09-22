import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react';

// Mock Clerk Provider for tests
const MockClerkProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-clerk-provider">{children}</div>;
};

interface RenderOptions {
  route?: string;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: React.ReactNode, 
  { route = '/', queryClient }: RenderOptions = {}
) {
  const testQueryClient = queryClient ?? new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        gcTime: 0,
        staleTime: 0
      },
      mutations: { 
        retry: false 
      }
    },
  });
  
  return render(
    <MockClerkProvider>
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter initialEntries={[route]}>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    </MockClerkProvider>
  );
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { 
        retry: false,
        gcTime: 0,
        staleTime: 0
      },
      mutations: { 
        retry: false 
      }
    },
  });
}