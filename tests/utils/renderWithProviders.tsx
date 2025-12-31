import React from 'react';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock Auth Provider for tests
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <div data-testid="mock-auth-provider">{children}</div>;
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
    <MockAuthProvider>
      <QueryClientProvider client={testQueryClient}>
        <MemoryRouter initialEntries={[route]}>
          {ui}
        </MemoryRouter>
      </QueryClientProvider>
    </MockAuthProvider>
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
