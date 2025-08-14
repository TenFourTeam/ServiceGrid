import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOnboardingState } from '@/onboarding/streamlined';

// Mock the unified queries
vi.mock('@/queries/unified', () => ({
  useBusiness: () => ({ data: { name: 'Test Business' }, isLoading: false }),
  useProfile: () => ({ data: { fullName: 'Test User', phoneE164: '+1234567890' }, isLoading: false }),
  useCustomersCount: () => ({ data: 0, isLoading: false }),
  useJobsCount: () => ({ data: 0, isLoading: false }),
  useQuotesCount: () => ({ data: 0, isLoading: false }),
  useStripeConnectStatus: () => ({ data: { chargesEnabled: false }, isLoading: false }),
  useSubscriptionStatus: () => ({ data: { subscribed: false }, isLoading: false }),
}));

vi.mock('@/auth', () => ({
  useBusinessAuth: () => ({ snapshot: { businessId: 'test-business-id' } }),
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

describe('Streamlined Onboarding State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates onboarding state correctly', () => {
    const { result } = renderHookWithProviders(() => useOnboardingState());
    
    expect(result.current.profileComplete).toBe(true);
    expect(result.current.hasCustomers).toBe(false);
    expect(result.current.loading).toBe(false);
    expect(result.current.isComplete).toBe(false);
  });
});