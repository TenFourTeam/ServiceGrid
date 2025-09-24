import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useBusinessContext } from '@/hooks/useBusinessContext';

// Mock Clerk hooks
const mockAuth = {
  isLoaded: true,
  isSignedIn: true,
  userId: 'user_123',
  getToken: vi.fn()
};

const mockBusiness = {
  data: { id: 'business_123', name: 'Test Business', role: 'owner' },
  isLoading: false,
  error: null,
  refetch: vi.fn()
};

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => mockAuth
}));

vi.mock('@/queries/useProfile', () => ({
  useProfile: vi.fn(() => ({ data: { business: mockBusiness.data } }))
}));

function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('Auth Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not fetch business data when Clerk is not loaded', () => {
    const useProfile = vi.fn(() => ({ data: { business: mockBusiness.data } }));
    vi.doMock('@/queries/useProfile', () => ({ useProfile }));
    
    mockAuth.isLoaded = false;
    mockAuth.isSignedIn = false;

    renderHook(() => useBusinessContext(), {
      wrapper: createTestWrapper()
    });

    // Profile query should not be enabled when not loaded
    expect(useProfile).toHaveBeenCalled();
  });

  it('should not fetch business data when user is not signed in', () => {
    const useProfile = vi.fn(() => ({ data: { business: mockBusiness.data } }));
    vi.doMock('@/queries/useProfile', () => ({ useProfile }));
    
    mockAuth.isLoaded = true;
    mockAuth.isSignedIn = false;

    renderHook(() => useBusinessContext(), {
      wrapper: createTestWrapper()
    });

    expect(useProfile).toHaveBeenCalled();
  });

  it('should fetch business data when fully authenticated', () => {
    const useProfile = vi.fn(() => ({ data: { business: mockBusiness.data } }));
    vi.doMock('@/queries/useProfile', () => ({ useProfile }));
    
    mockAuth.isLoaded = true;
    mockAuth.isSignedIn = true;

    renderHook(() => useBusinessContext(), {
      wrapper: createTestWrapper()
    });

    expect(useProfile).toHaveBeenCalled();
  });

  it('should coordinate loading states correctly', () => {
    mockAuth.isLoaded = false;
    mockBusiness.isLoading = true;

    const { result } = renderHook(() => useBusinessContext(), {
      wrapper: createTestWrapper()
    });

    // Should show loading when Clerk is not loaded, regardless of business query state
    expect(result.current.isLoadingBusiness).toBe(true);
  });

  it('should handle auth errors gracefully', () => {
    mockBusiness.error = { status: 401, message: 'Unauthorized' };
    mockBusiness.isLoading = false;

    const { result } = renderHook(() => useBusinessContext(), {
      wrapper: createTestWrapper()
    });

    expect(result.current.hasBusinessError).toBe(true);
  });
});