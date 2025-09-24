import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

// Enhanced auth state mock utilities
export interface MockAuthState {
  isLoaded?: boolean;
  isSignedIn?: boolean;
  userId?: string | null;
}

export interface MockBusinessState {
  data?: any;
  isLoading?: boolean;
  error?: Error | null;
}

export interface MockUserState {
  primaryEmailAddress?: { emailAddress: string } | null;
}

// Create controllable mock states
export function createMockAuthState(initial: MockAuthState = {}) {
  return {
    isLoaded: true,
    isSignedIn: false,
    userId: null,
    signOut: vi.fn(),
    ...initial
  };
}

export function createMockBusinessState(initial: MockBusinessState = {}) {
  return {
    data: null,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    ...initial
  };
}

export function createMockUserState(initial: MockUserState = {}) {
  return {
    user: {
      primaryEmailAddress: null,
      ...initial
    }
  };
}

// Auth test scenarios
export const AUTH_SCENARIOS = {
  LOADING: {
    auth: { isLoaded: false, isSignedIn: false, userId: null },
    business: { isLoading: true, data: null },
    user: { primaryEmailAddress: null }
  },
  SIGNED_OUT: {
    auth: { isLoaded: true, isSignedIn: false, userId: null },
    business: { isLoading: false, data: null },
    user: { primaryEmailAddress: null }
  },
  SIGNED_IN_NO_BUSINESS: {
    auth: { isLoaded: true, isSignedIn: true, userId: 'user_123' },
    business: { isLoading: false, data: null },
    user: { primaryEmailAddress: { emailAddress: 'test@example.com' } }
  },
  SIGNED_IN_BUSINESS_LOADING: {
    auth: { isLoaded: true, isSignedIn: true, userId: 'user_123' },
    business: { isLoading: true, data: null },
    user: { primaryEmailAddress: { emailAddress: 'test@example.com' } }
  },
  FULLY_AUTHENTICATED: {
    auth: { isLoaded: true, isSignedIn: true, userId: 'user_123' },
    business: { 
      isLoading: false, 
      data: { id: 'business_123', name: 'Test Business' }
    },
    user: { primaryEmailAddress: { emailAddress: 'test@example.com' } }
  },
  BUSINESS_ERROR: {
    auth: { isLoaded: true, isSignedIn: true, userId: 'user_123' },
    business: { 
      isLoading: false, 
      data: null,
      error: new Error('Failed to load business')
    },
    user: { primaryEmailAddress: { emailAddress: 'test@example.com' } }
  }
} as const;

// Enhanced render function with auth state control
interface RenderWithAuthOptions {
  authState?: MockAuthState;
  businessState?: MockBusinessState;
  userState?: MockUserState;
  route?: string;
  queryClient?: QueryClient;
  scenario?: keyof typeof AUTH_SCENARIOS;
}

export function renderWithAuth(
  ui: React.ReactNode,
  options: RenderWithAuthOptions = {}
) {
  const {
    authState = {},
    businessState = {},
    userState = {},
    route = '/',
    queryClient,
    scenario
  } = options;

  // Apply scenario if provided
  let finalAuthState = authState;
  let finalBusinessState = businessState;
  let finalUserState = userState;

  if (scenario) {
    const scenarioData = AUTH_SCENARIOS[scenario];
    finalAuthState = { ...scenarioData.auth, ...authState };
    finalBusinessState = { ...scenarioData.business, ...businessState };
    finalUserState = { ...scenarioData.user, ...userState };
  }

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

  // Mock Clerk hooks
  vi.doMock('@clerk/clerk-react', () => ({
    useAuth: () => createMockAuthState(finalAuthState),
    useUser: () => createMockUserState(finalUserState)
  }));

  // Mock profile query
  vi.doMock('@/queries/useProfile', () => ({
    useProfile: () => ({ data: { business: createMockBusinessState(finalBusinessState) } })
  }));

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      <MemoryRouter initialEntries={[route]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );

  return { wrapper, queryClient: testQueryClient };
}

// Utility for testing auth state transitions
export function createAuthTransition(
  from: keyof typeof AUTH_SCENARIOS,
  to: keyof typeof AUTH_SCENARIOS
) {
  return {
    from: AUTH_SCENARIOS[from],
    to: AUTH_SCENARIOS[to]
  };
}

// Common test assertions
export const AUTH_ASSERTIONS = {
  expectLoadingState: (container: HTMLElement) => {
    return container.querySelector('[data-testid="loading-screen"]') !== null;
  },
  expectAuthenticatedState: (container: HTMLElement, userId?: string) => {
    const hasProtectedContent = container.querySelector('[data-testid="protected-content"]') !== null;
    if (userId) {
      const userIdElement = container.querySelector('[data-testid="user-id"]');
      return hasProtectedContent && userIdElement?.textContent === userId;
    }
    return hasProtectedContent;
  },
  expectRedirectToAuth: (container: HTMLElement) => {
    return container.querySelector('[data-testid="auth-page"]') !== null;
  },
  expectRedirectToCalendar: (container: HTMLElement) => {
    return container.querySelector('[data-testid="calendar-page"]') !== null;
  }
};

// Mock error for testing error boundaries
export class TestAuthError extends Error {
  constructor(message = 'Test authentication error') {
    super(message);
    this.name = 'TestAuthError';
  }
}