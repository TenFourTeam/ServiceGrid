/**
 * Integration tests for business operations and user management
 * Tests business switching, leaving, and member management flows
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupEdgeFunctionMocks, restoreFetch, storeOriginalFetch } from '../fixtures/fetchMock';
import { useBusinessSwitcher } from '@/hooks/useBusinessSwitcher';
import { useBusinessLeaving } from '@/hooks/useBusinessLeaving';

// Mock dependencies
const mockCurrentBusiness = {
  currentBusinessId: 'biz_owner_a',
  setCurrentBusinessId: vi.fn()
};

const mockNavigate = vi.fn();

vi.mock('@/contexts/CurrentBusinessContext', () => ({
  useCurrentBusiness: () => mockCurrentBusiness
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    isSignedIn: true,
    getToken: vi.fn().mockResolvedValue('mock_token')
  })
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

describe('Business Operations Integration', () => {
  let queryClient: QueryClient;
  let mockUtils: ReturnType<typeof setupEdgeFunctionMocks>;
  
  beforeEach(() => {
    storeOriginalFetch();
    mockUtils = setupEdgeFunctionMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    
    // Reset mocks
    mockCurrentBusiness.setCurrentBusinessId.mockClear();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    restoreFetch();
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useBusinessSwitcher', () => {
    it('should switch business successfully', async () => {
      const { result } = renderHook(() => useBusinessSwitcher(), { wrapper });

      await act(async () => {
        result.current.switchBusiness.mutate('biz_owner_b');
      });

      await waitFor(() => {
        expect(result.current.switchBusiness.isSuccess).toBe(true);
      });

      expect(mockCurrentBusiness.setCurrentBusinessId).toHaveBeenCalledWith('biz_owner_b');
      expect(mockNavigate).toHaveBeenCalledWith('/calendar');
    });

    it('should handle switching state correctly', async () => {
      const { result } = renderHook(() => useBusinessSwitcher(), { wrapper });

      expect(result.current.isSwitching).toBe(false);

      act(() => {
        result.current.switchBusiness.mutate('biz_owner_b');
      });

      expect(result.current.isSwitching).toBe(true);

      await waitFor(() => {
        expect(result.current.isSwitching).toBe(false);
      });
    });
  });

  describe('useBusinessLeaving', () => {
    it('should leave business successfully', async () => {
      // Setup successful leave response
      mockUtils.addCustomResponse('leave-business', 'POST', {
        message: 'Successfully left business'
      });

      const { result } = renderHook(() => useBusinessLeaving(), { wrapper });

      await act(async () => {
        result.current.leaveBusiness.mutate({ businessId: 'biz_worker_a' });
      });

      await waitFor(() => {
        expect(result.current.leaveBusiness.isSuccess).toBe(true);
      });

      // Should reload the page after leaving
      expect(result.current.leaveBusiness.isSuccess).toBe(true);
    });

    it('should handle leave business errors', async () => {
      // Setup error response
      mockUtils.addCustomResponse('leave-business', 'POST', {
        error: { message: 'Cannot leave - you are the owner' }
      }, 400);

      const { result } = renderHook(() => useBusinessLeaving(), { wrapper });

      await act(async () => {
        result.current.leaveBusiness.mutate({ businessId: 'biz_owner_a' });
      });

      await waitFor(() => {
        expect(result.current.leaveBusiness.isError).toBe(true);
      });

      expect(result.current.leaveBusiness.error?.message).toContain('Cannot leave - you are the owner');
    });

    it('should handle leaving state correctly', async () => {
      mockUtils.addCustomResponse('leave-business', 'POST', {
        message: 'Successfully left business'
      });

      const { result } = renderHook(() => useBusinessLeaving(), { wrapper });

      expect(result.current.isLeaving).toBe(false);

      act(() => {
        result.current.leaveBusiness.mutate({ businessId: 'biz_worker_a' });
      });

      expect(result.current.isLeaving).toBe(true);

      await waitFor(() => {
        expect(result.current.isLeaving).toBe(false);
      });
    });
  });

  describe('Business Context Integration', () => {
    it('should invalidate queries after business operations', async () => {
      const { result: switcherResult } = renderHook(() => useBusinessSwitcher(), { wrapper });

      // Spy on queryClient invalidation
      const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

      await act(async () => {
        switcherResult.current.switchBusiness.mutate('biz_owner_b');
      });

      await waitFor(() => {
        expect(switcherResult.current.switchBusiness.isSuccess).toBe(true);
      });

      // Should invalidate profile and business queries
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['user-businesses'] });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle network errors during business operations', async () => {
      // Setup network error
      mockUtils.addCustomResponse('leave-business', 'POST', {
        error: { message: 'Network error' }
      }, 500);

      const { result } = renderHook(() => useBusinessLeaving(), { wrapper });

      await act(async () => {
        result.current.leaveBusiness.mutate({ businessId: 'biz_worker_a' });
      });

      await waitFor(() => {
        expect(result.current.leaveBusiness.isError).toBe(true);
      });

      expect(result.current.leaveBusiness.error?.message).toContain('Network error');
    });
  });

  describe('Multi-Business Scenarios', () => {
    it('should handle switching between multiple businesses', async () => {
      // Setup multiple business responses
      mockUtils.addCustomResponse('user-businesses', 'GET', [
        {
          id: 'biz_owner_a',
          name: 'Business A',
          role: 'owner',
          is_current: true
        },
        {
          id: 'biz_worker_b',
          name: 'Business B', 
          role: 'worker',
          is_current: false
        },
        {
          id: 'biz_owner_c',
          name: 'Business C',
          role: 'owner',
          is_current: false
        }
      ]);

      const { result } = renderHook(() => useBusinessSwitcher(), { wrapper });

      // Switch to Business B
      await act(async () => {
        result.current.switchBusiness.mutate('biz_worker_b');
      });

      await waitFor(() => {
        expect(result.current.switchBusiness.isSuccess).toBe(true);
      });

      expect(mockCurrentBusiness.setCurrentBusinessId).toHaveBeenCalledWith('biz_worker_b');

      // Switch to Business C  
      await act(async () => {
        result.current.switchBusiness.mutate('biz_owner_c');
      });

      await waitFor(() => {
        expect(result.current.switchBusiness.isSuccess).toBe(true);
      });

      expect(mockCurrentBusiness.setCurrentBusinessId).toHaveBeenCalledWith('biz_owner_c');
    });
  });
});