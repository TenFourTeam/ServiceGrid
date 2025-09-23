import { TestScenarioBuilder, callEdgeFunction } from './mockClerkAuth';

export interface APITestSetup {
  scenarios: TestScenarioBuilder;
}

/**
 * Create test scenarios for API endpoint testing
 * This approach is completely stateless - no database setup required.
 * The Edge Functions will handle profile/business creation automatically
 * when they receive valid Clerk JWT tokens.
 */
export function createAPITestSetup(): APITestSetup {
  const scenarios = TestScenarioBuilder.createDefault();
  
  return {
    scenarios
  };
}

/**
 * Helper to call Edge Functions in tests with proper error handling
 */
export async function testEdgeFunction(
  functionName: string,
  options: {
    scenario: string;
    scenarios: TestScenarioBuilder;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
  }
) {
  const { scenario, scenarios, method = 'GET', body } = options;
  const token = scenarios.getToken(scenario);
  
  const response = await callEdgeFunction(functionName, {
    method,
    token,
    body
  });

  let responseData;
  try {
    responseData = await response.json();
  } catch {
    responseData = await response.text();
  }

  return {
    response,
    data: responseData,
    status: response.status,
    ok: response.ok
  };
}