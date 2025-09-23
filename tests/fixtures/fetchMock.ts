/**
 * Elegant fetch mocking for Edge Function integration tests
 * Intercepts fetch calls and returns predefined stubs
 */

import { vi } from 'vitest';
import { getStubResponse } from './edgeFunctionStubs';

export interface MockFetchOptions {
  scenario?: string;
  customResponses?: Record<string, any>;
}

/**
 * Setup fetch mocking for Edge Functions
 */
export function setupEdgeFunctionMocks(options: MockFetchOptions = {}) {
  const { scenario = 'default', customResponses = {} } = options;

  // Mock global fetch
  const mockFetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
    const method = init?.method || 'GET';
    
    // Extract function name from Supabase Edge Function URL
    const functionMatch = url.match(/\/functions\/v1\/([^/?]+)/);
    if (!functionMatch) {
      throw new Error(`Invalid Edge Function URL: ${url}`);
    }
    
    const functionName = functionMatch[1];
    
    // Check for custom response first
    const customKey = `${functionName}:${method}`;
    if (customResponses[customKey]) {
      return createMockResponse(customResponses[customKey]);
    }
    
    try {
      // Get stub response
      const { response, status } = getStubResponse(functionName, method, scenario);
      return createMockResponse(response, status);
    } catch (error) {
      console.warn(`No stub found for ${functionName}:${method}, returning default success`);
      return createMockResponse({ success: true, message: `Mock response for ${functionName}` });
    }
  });

  // Replace global fetch
  global.fetch = mockFetch;
  
  return {
    mockFetch,
    resetMocks: () => {
      mockFetch.mockClear();
    },
    addCustomResponse: (functionName: string, method: string, response: any, status: number = 200) => {
      customResponses[`${functionName}:${method}`] = { response, status };
    }
  };
}

/**
 * Create a mock Response object
 */
function createMockResponse(data: any, status: number = 200): Response {
  const mockResponse = {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({
      'content-type': 'application/json',
    }),
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(JSON.stringify(data)),
    blob: vi.fn(),
    arrayBuffer: vi.fn(),
    formData: vi.fn(),
    clone: vi.fn(),
  } as unknown as Response;

  return mockResponse;
}

/**
 * Setup mock with specific business context
 */
export function setupBusinessContextMock(businessId: string, role: 'owner' | 'worker' = 'owner') {
  return setupEdgeFunctionMocks({
    scenario: businessId,
    customResponses: {
      'business-role:GET': {
        response: {
          role,
          business: {
            id: businessId,
            name: `${role === 'owner' ? 'Owner' : 'Worker'} Business`,
            description: `Test business for ${role}`,
            logo_url: null,
            phone: '+1234567890'
          }
        }
      }
    }
  });
}

/**
 * Setup mock for error scenarios
 */
export function setupErrorMocks() {
  return setupEdgeFunctionMocks({
    customResponses: {
      'customers-crud:GET': {
        response: { error: { message: 'Database connection failed' } },
        status: 500
      },
      'quotes-crud:POST': {
        response: { error: { message: 'Validation failed' } },
        status: 400
      }
    }
  });
}

/**
 * Restore original fetch after tests
 */
export function restoreFetch() {
  // Restore original fetch if it was stored
  if ((global as any).originalFetch) {
    global.fetch = (global as any).originalFetch;
  }
}

/**
 * Store original fetch before mocking
 */
export function storeOriginalFetch() {
  (global as any).originalFetch = global.fetch;
}