import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBusinessAuth } from '@/hooks/useBusinessAuth';

// Mock Clerk
const mockClerkAuth = {
  isLoaded: true,
  isSignedIn: true,
  userId: 'user_123',
  signOut: vi.fn()
};

const mockUser = {
  primaryEmailAddress: { emailAddress: 'test@example.com' }
};

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => mockClerkAuth,
  useUser: () => ({ user: mockUser })
}));

// Mock business query
const mockBusinessQuery = {
  data: {
    id: 'business_123',
    name: 'Test Business'
  },
  isLoading: false,
  refetch: vi.fn()
};

vi.mock('@/queries/useBusiness', () => ({
  useBusiness: () => mockBusinessQuery
}));

function renderHookWithProviders<T>(hook: () => T) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  return renderHook(hook, { wrapper });
}

describe('useBusinessAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockClerkAuth.isLoaded = true;
    mockClerkAuth.isSignedIn = true;
    mockClerkAuth.userId = 'user_123';
    mockBusinessQuery.data = {
      id: 'business_123',
      name: 'Test Business'
    };
    mockBusinessQuery.isLoading = false;
  });

  describe('auth phases', () => {
    it('returns loading phase when Clerk is not loaded', () => {
      mockClerkAuth.isLoaded = false;
      const { result } = renderHookWithProviders(() => useBusinessAuth());
      
      expect(result.current.snapshot.phase).toBe('loading');
      expect(result.current.isLoaded).toBe(false);
    });

    it('returns signed_out phase when not signed in', () => {
      mockClerkAuth.isSignedIn = false;
      mockClerkAuth.userId = null;
      const { result } = renderHookWithProviders(() => useBusinessAuth());
      
      expect(result.current.snapshot.phase).toBe('signed_out');
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('returns authenticated phase when signed in', () => {
      const { result } = renderHookWithProviders(() => useBusinessAuth());
      
      expect(result.current.snapshot.phase).toBe('authenticated');
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('snapshot data structure', () => {
    it('provides complete snapshot with user and business data', () => {
      const { result } = renderHookWithProviders(() => useBusinessAuth());
      
      expect(result.current.snapshot).toEqual({
        phase: 'authenticated',
        userId: 'user_123',
        email: 'test@example.com',
        businessId: 'business_123',
        businessName: 'Test Business',
        business: mockBusinessQuery.data,
        tenantId: 'business_123',
        roles: ['owner'],
        claimsVersion: 1
      });
    });

    it('handles missing business data gracefully', () => {
      mockBusinessQuery.data = null;
      const { result } = renderHookWithProviders(() => useBusinessAuth());
      
      expect(result.current.snapshot.businessId).toBeUndefined();
      expect(result.current.snapshot.businessName).toBeUndefined();
      expect(result.current.snapshot.tenantId).toBe('default');
      expect(result.current.snapshot.roles).toEqual([]);
    });

    it('handles missing user email gracefully', () => {
      vi.mocked(mockUser).primaryEmailAddress = null;
      const { result } = renderHookWithProviders(() => useBusinessAuth());
      
      expect(result.current.snapshot.email).toBeUndefined();
    });
  });

  describe('business helpers', () => {
    it('provides current business information', () => {
      const { result } = renderHookWithProviders(() => useBusinessAuth());
      
      expect(result.current.currentBusiness).toEqual({
        id: 'business_123',
        name: 'Test Business',
        isLoaded: true
      });
    });

    it('indicates business not loaded when loading', () => {
      mockBusinessQuery.isLoading = true;
      const { result } = renderHookWithProviders(() => useBusinessAuth());
      
      expect(result.current.currentBusiness.isLoaded).toBe(false);
    });

    it('indicates business not loaded when no data', () => {
      mockBusinessQuery.data = null;
      const { result } = renderHookWithProviders(() => useBusinessAuth());
      
      expect(result.current.currentBusiness.isLoaded).toBe(false);
    });
  });

  describe('auth methods', () => {
    it('exposes signOut method', () => {
      const { result } = renderHookWithProviders(() => useBusinessAuth());
      
      expect(result.current.signOut).toBe(mockClerkAuth.signOut);
    });

    it('exposes refreshBusiness method', () => {
      const { result } = renderHookWithProviders(() => useBusinessAuth());
      
      expect(result.current.refreshBusiness).toBe(mockBusinessQuery.refetch);
    });
  });
});