/**
 * Integration tests for React hooks with mocked Edge Function responses
 * Tests the complete flow from hook -> useAuthApi -> fetch -> Edge Function stubs
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupEdgeFunctionMocks, setupBusinessContextMock, restoreFetch, storeOriginalFetch } from '../fixtures/fetchMock';
import { useCustomersData } from '@/hooks/useCustomersData';
import { useQuotesData } from '@/hooks/useQuotesData';
import { useInvoicesData } from '@/hooks/useInvoicesData';
import { useUserBusinesses } from '@/hooks/useUserBusinesses';
import { useAuditLogs } from '@/hooks/useAuditLogs';

// Mock the auth context and Clerk
const mockBusinessContext = {
  isAuthenticated: true,
  businessId: 'biz_owner_a',
  currentBusiness: { id: 'biz_owner_a', name: 'Test Business' },
  userRole: 'owner'
};

vi.mock('@/hooks/useBusinessContext', () => ({
  useBusinessContext: () => mockBusinessContext
}));

vi.mock('@clerk/clerk-react', () => ({
  useAuth: () => ({
    isSignedIn: true,
    getToken: vi.fn().mockResolvedValue('mock_token')
  })
}));

describe('React Hooks Integration with Edge Functions', () => {
  let queryClient: QueryClient;
  let mockUtils: ReturnType<typeof setupEdgeFunctionMocks>;
  
  beforeEach(() => {
    storeOriginalFetch();
    mockUtils = setupBusinessContextMock('biz_owner_a', 'owner');
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    restoreFetch();
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('useCustomersData', () => {
    it('should fetch customers successfully', async () => {
      const { result } = renderHook(() => useCustomersData(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data[0].name).toBe('John Doe');
      expect(result.current.data[1].name).toBe('Jane Smith');
      expect(result.current.count).toBe(2);
      expect(result.current.isError).toBe(false);
    });

    it('should handle business context correctly', async () => {
      const { result } = renderHook(() => useCustomersData(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify data transformation (snake_case to camelCase)
      expect(result.current.data[0]).toHaveProperty('businessId');
      expect(result.current.data[0]).toHaveProperty('ownerId');
      expect(result.current.data[0]).toHaveProperty('createdAt');
      expect(result.current.data[0]).not.toHaveProperty('business_id');
    });
  });

  describe('useQuotesData', () => {
    it('should fetch quotes successfully', async () => {
      const { result } = renderHook(() => useQuotesData(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].title).toBe('Kitchen Renovation');
      expect(result.current.data[0].total_amount).toBe(15000.00);
      expect(result.current.count).toBe(1);
    });
  });

  describe('useInvoicesData', () => {
    it('should fetch invoices successfully', async () => {
      const { result } = renderHook(() => useInvoicesData(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].invoice_number).toBe('INV-2024-001');
      expect(result.current.data[0].status).toBe('paid');
      expect(result.current.count).toBe(1);
    });
  });

  describe('useUserBusinesses', () => {
    it('should fetch user businesses successfully', async () => {
      const { result } = renderHook(() => useUserBusinesses(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(2);
      expect(result.current.data[0].name).toBe('Owner Business A');
      expect(result.current.data[0].role).toBe('owner');
      expect(result.current.data[1].name).toBe('Worker Business B');
      expect(result.current.data[1].role).toBe('worker');
    });
  });

  describe('useAuditLogs', () => {
    it('should fetch audit logs successfully', async () => {
      const { result } = renderHook(() => useAuditLogs('biz_owner_a'), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toHaveLength(1);
      expect(result.current.data[0].action).toBe('customer_created');
      expect(result.current.data[0].resource_type).toBe('customer');
      expect(result.current.data[0].business_id).toBe('biz_owner_a');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      // Setup error response
      mockUtils.addCustomResponse('customers-crud', 'GET', {
        error: { message: 'Database connection failed' }
      }, 500);

      const { result } = renderHook(() => useCustomersData(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error?.message).toContain('Failed to fetch customers');
    });
  });

  describe('Different User Roles', () => {
    it('should work with worker role', async () => {
      // Update business context for worker
      mockBusinessContext.userRole = 'worker';
      
      // Setup worker-specific responses
      mockUtils = setupBusinessContextMock('biz_owner_a', 'worker');

      const { result } = renderHook(() => useCustomersData(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Workers should still see customers but potentially filtered
      expect(result.current.data).toBeDefined();
      expect(Array.isArray(result.current.data)).toBe(true);
    });
  });

  describe('Business Isolation', () => {
    it('should isolate data by business', async () => {
      // Test with different business ID
      mockBusinessContext.businessId = 'biz_owner_b';
      
      // Setup business B specific data
      mockUtils.addCustomResponse('customers-crud', 'GET', {
        customers: [
          {
            id: 'cust_b1',
            business_id: 'biz_owner_b',
            name: 'Business B Customer',
            email: 'customerb@example.com'
          }
        ],
        count: 1
      });

      const { result } = renderHook(() => useCustomersData(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data[0].name).toBe('Business B Customer');
      expect(result.current.data[0].businessId).toBe('biz_owner_b');
    });
  });
});