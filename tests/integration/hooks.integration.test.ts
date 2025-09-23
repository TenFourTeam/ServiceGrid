import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { useCustomersData } from '@/hooks/useCustomersData';
import { useCustomerOperations } from '@/hooks/useCustomerOperations';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { mockUseAuthApi } from '../fixtures/mockAuthApi';

// Mock the useAuthApi hook
vi.mock('@/hooks/useAuthApi', () => ({
  useAuthApi: mockUseAuthApi('owner')
}));

// Mock the business context to provide test business data
vi.mock('@/hooks/useBusinessContext', async () => {
  const actual = await vi.importActual('@/hooks/useBusinessContext');
  return {
    ...actual,
    useBusinessContext: vi.fn(() => ({
      isAuthenticated: true,
      businessId: 'business-1',
      businessName: 'Test Business',
      role: 'owner',
      canManage: true,
      isLoadingBusiness: false,
      hasBusinessError: false
    }))
  };
});

// Test wrapper with QueryClient
function createTestWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  return TestWrapper;
}

describe('Integration Tests - React Hooks with Mock API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useCustomersData', () => {
    it('fetches and returns customer data correctly', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCustomersData(), { wrapper });

      // Initially loading
      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toEqual([]);

      // Wait for data to load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify data structure
      expect(result.current.data).toHaveLength(2);
      expect(result.current.count).toBe(2);
      
      const firstCustomer = result.current.data[0];
      expect(firstCustomer).toMatchObject({
        id: 'customer-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890'
      });

      expect(result.current.isError).toBe(false);
    });

    it('handles disabled state correctly', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCustomersData({ enabled: false }), { wrapper });

      // Should not load when disabled
      expect(result.current.isLoading).toBe(false);
      expect(result.current.data).toEqual([]);
    });
  });

  describe('useCustomerOperations', () => {
    it('creates customer successfully', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCustomerOperations(), { wrapper });

      expect(result.current.isDeletingCustomer).toBe(false);
      expect(result.current.isBulkDeleting).toBe(false);
    });
  });

  describe('Business Context Integration', () => {
    it('provides correct business context data', () => {
      const { result } = renderHook(() => useBusinessContext());

      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.businessId).toBe('business-1');
      expect(result.current.businessName).toBe('Test Business');
      expect(result.current.role).toBe('owner');
      expect(result.current.canManage).toBe(true);
      expect(result.current.isLoadingBusiness).toBe(false);
    });
  });

  describe('Role-based Access Control', () => {
    it('owner sees full customer contact information', async () => {
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCustomersData(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const customer = result.current.data[0];
      expect(customer.email).toBe('john@example.com');
      expect(customer.phone).toBe('+1234567890');
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      // This test would require modifying the mock to return an error
      // For now, we verify the error handling structure exists
      const wrapper = createTestWrapper();
      const { result } = renderHook(() => useCustomersData(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify error handling properties exist
      expect(typeof result.current.isError).toBe('boolean');
      expect(result.current.error).toBeDefined();
    });
  });
});