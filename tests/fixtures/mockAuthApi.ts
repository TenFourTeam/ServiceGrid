import { vi } from 'vitest';
import { mockResponses, mockErrors } from './mockResponses';

/**
 * Mock implementation of useAuthApi hook
 * Returns controlled responses without any network calls or authentication
 */
export function createMockAuthApi(scenario: 'owner' | 'worker' | 'unauthorized' = 'owner') {
  const invoke = vi.fn().mockImplementation(async (functionName: string, options: any = {}) => {
    // Handle unauthorized scenario
    if (scenario === 'unauthorized') {
      return mockErrors.unauthorized;
    }

    // Get method (default to GET)
    const method = options.method || 'GET';
    
    // Find the mock response
    const functionMocks = mockResponses[functionName as keyof typeof mockResponses];
    if (!functionMocks) {
      console.warn(`No mock response for function: ${functionName}`);
      return { data: null, error: { message: 'Function not found' } };
    }

    const response = functionMocks[method as keyof typeof functionMocks];
    if (!response) {
      console.warn(`No mock response for ${functionName} ${method}`);
      return { data: null, error: { message: 'Method not found' } };
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 10));

    // Filter data based on scenario (worker vs owner permissions)
    if (scenario === 'worker' && functionName === 'customers-crud' && method === 'GET') {
      // Workers see limited customer contact info
      const limitedCustomers = response.data.customers.map((customer: any) => ({
        ...customer,
        email: customer.email ? 'hidden@privacy.com' : null,
        phone: customer.phone ? '+1-XXX-XXX-XXXX' : null
      }));
      
      return {
        data: { ...response.data, customers: limitedCustomers },
        error: null
      };
    }

    return response;
  });

  return { invoke };
}

/**
 * Mock useAuthApi hook for testing
 */
export const mockUseAuthApi = (scenario: 'owner' | 'worker' | 'unauthorized' = 'owner') => {
  return vi.fn(() => createMockAuthApi(scenario));
};