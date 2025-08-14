import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';
import { renderHook } from '@testing-library/react';
// @ts-ignore - waitFor import issues with current version  
import { waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useProfileOperations } from '@/hooks/useProfileOperations';

// Mock toast
const mockToast = vi.fn();
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

const SUPABASE_URL = 'https://ijudkzqfriazabiosnvb.supabase.co';

// MSW Server setup
const server = setupServer(
  http.post(`${SUPABASE_URL}/functions/v1/profile-update`, () => {
    return HttpResponse.json({
      data: {
        fullName: 'Alex Rivera',
        businessName: 'Tenfour Co',
        phoneE164: '+15551234567'
      }
    });
  })
);

function renderHookWithProviders<T>(hook: () => T) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });
  
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
  
  return renderHook(hook, { wrapper });
}

describe('Query Invalidation', () => {
  const invalidateSpy = vi.fn();
  const dispatchEventSpy = vi.fn();
  
  beforeEach(() => {
    server.listen();
    mockToast.mockClear();
    invalidateSpy.mockClear();
    dispatchEventSpy.mockClear();
    
    // Mock query client invalidation
    vi.spyOn(QueryClient.prototype, 'invalidateQueries').mockImplementation(invalidateSpy);
    
    // Mock window.dispatchEvent
    vi.spyOn(window, 'dispatchEvent').mockImplementation(dispatchEventSpy);
  });
  
  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
  });
  
  afterAll(() => {
    server.close();
  });

  describe('Exact Query Key Alignment', () => {
    it('invalidates all agreed-upon query keys on success', async () => {
      const { result } = renderHookWithProviders(() => useProfileOperations());
      
      // Trigger mutation
      result.current.updateProfile.mutate({
        fullName: 'Alex Rivera',
        businessName: 'Tenfour Co',
        phoneRaw: '5551234567'
      });
      
      // Wait for mutation to complete
      await waitFor(() => {
        expect(result.current.updateProfile.isSuccess).toBe(true);
      });
      
      // Assert exact query keys are invalidated
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['profile.current'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['business.current'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard.summary'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['dashboard-data'] }); // legacy compatibility
      
      // Assert exactly 4 invalidation calls
      expect(invalidateSpy).toHaveBeenCalledTimes(4);
    });

    it('does not use legacy/wrong query keys', async () => {
      const { result } = renderHookWithProviders(() => useProfileOperations());
      
      result.current.updateProfile.mutate({
        fullName: 'Alex Rivera',
        businessName: 'Tenfour Co', 
        phoneRaw: '5551234567'
      });
      
      await waitFor(() => {
        expect(result.current.updateProfile.isSuccess).toBe(true);
      });
      
      // Assert these wrong keys are NOT used
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['profile'] });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['user'] });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['business'] });
      expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: ['dashboard'] });
    });
  });

  describe('Custom Event Dispatch', () => {
    it('dispatches business-updated event on success', async () => {
      const { result } = renderHookWithProviders(() => useProfileOperations());
      
      result.current.updateProfile.mutate({
        fullName: 'Alex Rivera',
        businessName: 'Tenfour Co',
        phoneRaw: '5551234567'
      });
      
      await waitFor(() => {
        expect(result.current.updateProfile.isSuccess).toBe(true);
      });
      
      // Assert custom event is dispatched
      expect(dispatchEventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'business-updated'
        })
      );
      
      expect(dispatchEventSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Scenarios', () => {
    it('does not invalidate queries on mutation error', async () => {
      // Setup error response
      server.use(
        http.post(`${SUPABASE_URL}/functions/v1/profile-update`, () => {
          return HttpResponse.json({
            error: { message: 'Validation error' }
          }, { status: 400 });
        })
      );
      
      const { result } = renderHookWithProviders(() => useProfileOperations());
      
      result.current.updateProfile.mutate({
        fullName: 'Alex Rivera',
        businessName: 'Tenfour Co',
        phoneRaw: '5551234567'
      });
      
      await waitFor(() => {
        expect(result.current.updateProfile.isError).toBe(true);
      });
      
      // Assert no queries were invalidated on error
      expect(invalidateSpy).not.toHaveBeenCalled();
      
      // Assert no custom event dispatched on error
      expect(dispatchEventSpy).not.toHaveBeenCalled();
      
      // Assert error toast was shown
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Save failed',
        description: 'Validation error',
        variant: 'destructive'
      });
    });
  });

  describe('Toast Notifications', () => {
    it('shows success toast with correct message', async () => {
      const { result } = renderHookWithProviders(() => useProfileOperations());
      
      result.current.updateProfile.mutate({
        fullName: 'Alex Rivera',
        businessName: 'Tenfour Co',
        phoneRaw: '5551234567'
      });
      
      await waitFor(() => {
        expect(result.current.updateProfile.isSuccess).toBe(true);
      });
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Profile updated',
        description: 'Your profile changes have been saved.'
      });
    });

    it('shows error toast with server error message', async () => {
      server.use(
        http.post(`${SUPABASE_URL}/functions/v1/profile-update`, () => {
          return HttpResponse.json({
            error: { 
              code: 'VALIDATION_ERROR',
              message: 'Phone number format is invalid'
            }
          }, { status: 422 });
        })
      );
      
      const { result } = renderHookWithProviders(() => useProfileOperations());
      
      result.current.updateProfile.mutate({
        fullName: 'Alex Rivera',
        businessName: 'Tenfour Co',
        phoneRaw: 'invalid-phone'
      });
      
      await waitFor(() => {
        expect(result.current.updateProfile.isError).toBe(true);
      });
      
      // Should show the exact server error message, not generic fallback
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Save failed',
        description: 'Phone number format is invalid',
        variant: 'destructive'
      });
    });

    it('shows generic error message for network failures', async () => {
      server.use(
        http.post(`${SUPABASE_URL}/functions/v1/profile-update`, () => {
          return HttpResponse.error();
        })
      );
      
      const { result } = renderHookWithProviders(() => useProfileOperations());
      
      result.current.updateProfile.mutate({
        fullName: 'Alex Rivera',
        businessName: 'Tenfour Co',
        phoneRaw: '5551234567'
      });
      
      await waitFor(() => {
        expect(result.current.updateProfile.isError).toBe(true);
      });
      
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Save failed',
        description: 'Failed to save your changes. Please check your connection and try again.',
        variant: 'destructive'
      });
    });
  });
});