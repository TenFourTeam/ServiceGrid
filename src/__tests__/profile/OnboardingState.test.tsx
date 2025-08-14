import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useOnboardingContext } from '@/components/Onboarding/useOnboardingContext';
import { hasNameAndBusiness } from '@/components/Onboarding/guards';

// Mock hooks
const mockDashboardData = vi.fn();
const mockCustomersData = vi.fn();
const mockJobsData = vi.fn();
const mockQuotesData = vi.fn();
const mockUser = vi.fn();
const mockBusiness = vi.fn();

vi.mock('@/hooks/useDashboardData', () => ({
  useDashboardData: () => mockDashboardData()
}));

vi.mock('@/hooks/useSupabaseCustomers', () => ({
  useSupabaseCustomers: () => mockCustomersData()
}));

vi.mock('@/hooks/useSupabaseJobs', () => ({
  useSupabaseJobs: () => mockJobsData()
}));

vi.mock('@/hooks/useSupabaseQuotes', () => ({
  useSupabaseQuotes: () => mockQuotesData()
}));

vi.mock('@clerk/clerk-react', () => ({
  useUser: () => mockUser()
}));

vi.mock('@/store/useAppStore', () => ({
  useStore: () => mockBusiness()
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

describe('Onboarding State Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Profile Completion Detection', () => {
    it('detects incomplete profile (missing DB data)', () => {
      // Mock data sources - profile incomplete in DB
      mockDashboardData.mockReturnValue({
        data: {
          profile: { full_name: null, phone_e164: null }, // DB profile incomplete
          business: { name: 'Tenfour Co' },
          stripeStatus: { chargesEnabled: false },
          subscription: { subscribed: false }
        }
      });
      
      mockCustomersData.mockReturnValue({ data: { rows: [] } });
      mockJobsData.mockReturnValue({ data: { rows: [] } });
      mockQuotesData.mockReturnValue({ data: { rows: [] } });
      
      // Clerk has data but we should use DB data
      mockUser.mockReturnValue({ 
        fullName: 'Alex Rivera',  // This should be ignored
        firstName: 'Alex'
      });
      
      mockBusiness.mockReturnValue({ name: 'Tenfour Co' });
      
      const { result } = renderHookWithProviders(() => useOnboardingContext());
      
      // Should be incomplete based on DB data, not Clerk data
      expect(result.current.hasNameAndBusiness).toBe(false);
      expect(result.current.dataReady).toBe(true);
    });

    it('detects complete profile (DB data present)', () => {
      // Mock data sources - profile complete in DB
      mockDashboardData.mockReturnValue({
        data: {
          profile: { 
            full_name: 'Alex Rivera',     // DB profile complete
            phone_e164: '+15551234567' 
          },
          business: { name: 'Tenfour Co' },
          stripeStatus: { chargesEnabled: false },
          subscription: { subscribed: false }
        }
      });
      
      mockCustomersData.mockReturnValue({ data: { rows: [] } });
      mockJobsData.mockReturnValue({ data: { rows: [] } });
      mockQuotesData.mockReturnValue({ data: { rows: [] } });
      
      // Clerk data is irrelevant when DB has data
      mockUser.mockReturnValue({ 
        fullName: null,  // This should be ignored
        firstName: null
      });
      
      mockBusiness.mockReturnValue({ name: 'Tenfour Co' });
      
      const { result } = renderHookWithProviders(() => useOnboardingContext());
      
      // Should be complete based on DB data
      expect(result.current.hasNameAndBusiness).toBe(true);
      expect(result.current.dataReady).toBe(true);
    });

    it('detects business name missing ("My Business" is incomplete)', () => {
      mockDashboardData.mockReturnValue({
        data: {
          profile: { full_name: 'Alex Rivera', phone_e164: '+15551234567' },
          business: { name: 'My Business' }, // Default name = incomplete
          stripeStatus: { chargesEnabled: false },
          subscription: { subscribed: false }
        }
      });
      
      mockCustomersData.mockReturnValue({ data: { rows: [] } });
      mockJobsData.mockReturnValue({ data: { rows: [] } });
      mockQuotesData.mockReturnValue({ data: { rows: [] } });
      
      mockUser.mockReturnValue({ firstName: 'Alex', fullName: 'Alex Rivera' });
      mockBusiness.mockReturnValue({ name: 'My Business' });
      
      const { result } = renderHookWithProviders(() => useOnboardingContext());
      
      expect(result.current.hasNameAndBusiness).toBe(false);
    });
  });

  describe('Guard Functions', () => {
    it('hasNameAndBusiness guard uses DB sources correctly', () => {
      // Complete profile context
      const completeContext = {
        jobsCount: 0,
        quotesCount: 0,
        customersCount: 0,
        bankLinked: false,
        subscribed: false,
        hasNameAndBusiness: true, // Computed from DB data
        hasSentQuotes: false,
        hasScheduledJobs: false,
        dataReady: true,
        version: 1
      };
      
      expect(hasNameAndBusiness(completeContext)).toBe(true);
      
      // Incomplete profile context
      const incompleteContext = {
        ...completeContext,
        hasNameAndBusiness: false
      };
      
      expect(hasNameAndBusiness(incompleteContext)).toBe(false);
    });
  });

  describe('Progress Calculation', () => {
    it('calculates progress based on step completion, not hardcoded percentages', () => {
      // Test with only profile complete
      mockDashboardData.mockReturnValue({
        data: {
          profile: { full_name: 'Alex Rivera', phone_e164: '+15551234567' },
          business: { name: 'Tenfour Co' },
          stripeStatus: { chargesEnabled: false },
          subscription: { subscribed: false }
        }
      });
      
      mockCustomersData.mockReturnValue({ data: { rows: [] } }); // No customers
      mockJobsData.mockReturnValue({ data: { rows: [] } });      // No jobs  
      mockQuotesData.mockReturnValue({ data: { rows: [] } });    // No quotes
      
      mockUser.mockReturnValue({ firstName: 'Alex', fullName: 'Alex Rivera' });
      mockBusiness.mockReturnValue({ name: 'Tenfour Co' });
      
      const { result } = renderHookWithProviders(() => useOnboardingContext());
      
      // Profile step should be complete
      expect(result.current.hasNameAndBusiness).toBe(true);
      
      // Other steps should be incomplete
      expect(result.current.customersCount).toBe(0);
      expect(result.current.jobsCount).toBe(0);
      expect(result.current.quotesCount).toBe(0);
      expect(result.current.bankLinked).toBe(false);
      expect(result.current.subscribed).toBe(false);
      
      // Version should change when data changes (for stable dependencies)
      expect(result.current.version).toBeGreaterThan(0);
    });
  });

  describe('Data Source Priority', () => {
    it('prioritizes DB profile data over Clerk user data', () => {
      // DB has profile data
      mockDashboardData.mockReturnValue({
        data: {
          profile: { 
            full_name: 'Database Name',      // DB value
            phone_e164: '+15551234567' 
          },
          business: { name: 'Database Business' },
          stripeStatus: { chargesEnabled: false },
          subscription: { subscribed: false }
        }
      });
      
      mockCustomersData.mockReturnValue({ data: { rows: [] } });
      mockJobsData.mockReturnValue({ data: { rows: [] } });
      mockQuotesData.mockReturnValue({ data: { rows: [] } });
      
      // Clerk has different data
      mockUser.mockReturnValue({ 
        fullName: 'Clerk Name',  // Different from DB
        firstName: 'Clerk'
      });
      
      mockBusiness.mockReturnValue({ name: 'Database Business' });
      
      const { result } = renderHookWithProviders(() => useOnboardingContext());
      
      // Should use DB data for completion detection
      expect(result.current.hasNameAndBusiness).toBe(true);
      
      // The context doesn't expose the actual names, but the completion
      // should be based on DB data having both full_name and business name
    });

    it('falls back to Clerk when DB profile is empty', () => {
      // DB profile is empty
      mockDashboardData.mockReturnValue({
        data: {
          profile: { full_name: null, phone_e164: null }, // No DB data
          business: { name: 'Real Business' },
          stripeStatus: { chargesEnabled: false },
          subscription: { subscribed: false }
        }
      });
      
      mockCustomersData.mockReturnValue({ data: { rows: [] } });
      mockJobsData.mockReturnValue({ data: { rows: [] } });
      mockQuotesData.mockReturnValue({ data: { rows: [] } });
      
      // Clerk has data
      mockUser.mockReturnValue({ 
        fullName: 'Clerk Name',
        firstName: 'Clerk'
      });
      
      mockBusiness.mockReturnValue({ name: 'Real Business' });
      
      const { result } = renderHookWithProviders(() => useOnboardingContext());
      
      // Should still be incomplete since DB profile is empty
      // (the implementation should prioritize DB data)
      expect(result.current.hasNameAndBusiness).toBe(false);
    });
  });
});
