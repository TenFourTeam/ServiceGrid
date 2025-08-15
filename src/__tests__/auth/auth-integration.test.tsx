import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthBoundary } from '@/auth/AuthBoundary';
import { QueryClientClerkIntegration } from '@/auth/QueryClientClerkIntegration';
import { useBusinessContext } from '@/hooks/useBusinessContext';

// Mock components for testing
function ProtectedPage() {
  const { userId, businessId, isAuthenticated } = useBusinessContext();
  return (
    <div>
      <div data-testid="protected-content">Protected Page</div>
      <div data-testid="user-id">{userId}</div>
      <div data-testid="business-id">{businessId}</div>
      <div data-testid="auth-phase">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
    </div>
  );
}

function PublicPage() {
  return <div data-testid="public-content">Public Page</div>;
}

function LoadingScreen() {
  return <div data-testid="loading-screen">Loading...</div>;
}

// Mock Clerk auth with controllable state
const mockAuth = {
  isLoaded: false,
  isSignedIn: false,
  userId: null,
  signOut: vi.fn()
};

const mockUser = {
  primaryEmailAddress: { emailAddress: 'test@example.com' }
};

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => mockAuth,
  useUser: () => ({ user: mockUser })
}));

// Mock business query with controllable state
const mockBusinessQuery = {
  data: null,
  isLoading: true,
  refetch: vi.fn()
};

vi.mock('@/queries/useBusiness', () => ({
  useBusiness: () => mockBusinessQuery
}));

vi.mock('@/components/LoadingScreen', () => ({
  default: LoadingScreen
}));

function TestApp({ initialRoute = '/' }: { initialRoute?: string }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <QueryClientClerkIntegration />
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/protected" element={
            <AuthBoundary requireAuth>
              <ProtectedPage />
            </AuthBoundary>
          } />
          <Route path="/public" element={
            <AuthBoundary publicOnly>
              <PublicPage />
            </AuthBoundary>
          } />
          <Route path="/clerk-auth" element={<div data-testid="auth-page">Auth Page</div>} />
          <Route path="/calendar" element={<div data-testid="calendar-page">Calendar</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('Auth Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to loading state
    mockAuth.isLoaded = false;
    mockAuth.isSignedIn = false;
    mockAuth.userId = null;
    mockBusinessQuery.data = null;
    mockBusinessQuery.isLoading = true;
  });

  describe('Complete auth flow', () => {
    it('handles full authentication lifecycle', () => {
      // 1. Start with loading state
      const { rerender, container } = render(<TestApp initialRoute="/protected" />);
      
      expect(container.querySelector('[data-testid="loading-screen"]')).toBeInTheDocument();
      
      // 2. Clerk finishes loading, user is signed out
      mockAuth.isLoaded = true;
      mockAuth.isSignedIn = false;
      rerender(<TestApp initialRoute="/protected" />);
      
      expect(container.querySelector('[data-testid="auth-page"]')).toBeInTheDocument();
      
      // 3. User signs in
      mockAuth.isSignedIn = true;
      mockAuth.userId = 'user_123';
      rerender(<TestApp initialRoute="/protected" />);
      
      expect(container.querySelector('[data-testid="protected-content"]')).toBeInTheDocument();
      expect(container.querySelector('[data-testid="auth-phase"]')).toHaveTextContent('authenticated');
    });
  });

  describe('Route protection', () => {
    it('protects routes when user is not authenticated', () => {
      mockAuth.isLoaded = true;
      mockAuth.isSignedIn = false;
      
      const { container } = render(<TestApp initialRoute="/protected" />);
      
      expect(container.querySelector('[data-testid="auth-page"]')).toBeInTheDocument();
    });

    it('allows authenticated users to access protected routes', () => {
      mockAuth.isLoaded = true;
      mockAuth.isSignedIn = true;
      mockAuth.userId = 'user_123';
      mockBusinessQuery.isLoading = false;
      mockBusinessQuery.data = { id: 'business_123', name: 'Test Business' };
      
      const { container } = render(<TestApp initialRoute="/protected" />);
      
      expect(container.querySelector('[data-testid="protected-content"]')).toBeInTheDocument();
    });
  });
});