import { createHash } from 'crypto';

/**
 * Mock Clerk JWT utilities for integration testing
 * Generates realistic JWT tokens that can be validated by Edge Functions
 */

export interface MockUser {
  id: string;
  email: string;
  fullName?: string;
}

export interface MockBusiness {
  id: string;
  name: string;
  ownerId: string;
}

export interface TestContext {
  user: MockUser;
  business: MockBusiness;
  userRole: 'owner' | 'worker';
}

/**
 * Generate a mock Clerk JWT token for testing
 * This creates a JWT-like structure that matches what Clerk would send
 * Enhanced to work with the mock verifyToken function
 */
export function createMockClerkJWT(user: MockUser): string {
  const header = {
    alg: 'RS256',
    cat: 'cl_test',
    kid: 'test_key',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    iss: 'https://test-clerk.accounts.dev',
    aud: 'authenticated',
    exp: now + 3600, // 1 hour from now
    iat: now,
    nbf: now - 5,
    email: user.email,
    primary_email: user.email,
    azp: 'https://test-app.lovable.app',
    sid: `sess_${user.id}_${now}`,
    // Add additional Clerk-like claims
    email_verified: true,
    phone_number_verified: false,
    created_at: now - 86400, // Created a day ago
    updated_at: now - 3600    // Updated an hour ago
  };

  // Base64 encode header and payload (simplified for testing)
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  // Create a mock signature (in real tests, we'll mock the verification)
  const signature = createHash('sha256')
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Create HTTP headers for authenticated requests to Edge Functions
 */
export function createAuthHeaders(token: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-client-info': 'supabase-js-web/2.54.0',
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdWRrenFmcmlhemFiaW9zbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzIyNjAsImV4cCI6MjA3MDI0ODI2MH0.HLOwmgddlBTcHfYrX9RYvO8RK6IVkjDQvsdHyXuMXIM'
  };
}

/**
 * Call a Supabase Edge Function with authentication
 */
export async function callEdgeFunction(
  functionName: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    token: string;
    body?: any;
  }
): Promise<Response> {
  const { method = 'GET', token, body } = options;
  
  const url = `https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/${functionName}`;
  const headers = createAuthHeaders(token);

  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Generate test scenarios for different user/business combinations
 */
export class TestScenarioBuilder {
  private scenarios: Map<string, TestContext> = new Map();

  addScenario(key: string, context: TestContext): this {
    this.scenarios.set(key, context);
    return this;
  }

  getScenario(key: string): TestContext {
    const scenario = this.scenarios.get(key);
    if (!scenario) {
      throw new Error(`Test scenario '${key}' not found`);
    }
    return scenario;
  }

  getToken(key: string): string {
    const scenario = this.getScenario(key);
    return createMockClerkJWT(scenario.user);
  }

  static createDefault(): TestScenarioBuilder {
    const builder = new TestScenarioBuilder();

    // Business A - Owner
    builder.addScenario('businessOwnerA', {
      user: {
        id: 'user_owner_a',
        email: 'owner-a@test.com',
        fullName: 'Owner A'
      },
      business: {
        id: 'business_a',
        name: 'Business A',
        ownerId: 'profile_owner_a'
      },
      userRole: 'owner'
    });

    // Business A - Worker
    builder.addScenario('businessWorkerA', {
      user: {
        id: 'user_worker_a',
        email: 'worker-a@test.com',
        fullName: 'Worker A'
      },
      business: {
        id: 'business_a',
        name: 'Business A',
        ownerId: 'profile_owner_a'
      },
      userRole: 'worker'
    });

    // Business B - Owner (different business)
    builder.addScenario('businessOwnerB', {
      user: {
        id: 'user_owner_b',
        email: 'owner-b@test.com',
        fullName: 'Owner B'
      },
      business: {
        id: 'business_b',
        name: 'Business B',
        ownerId: 'profile_owner_b'
      },
      userRole: 'owner'
    });

    return builder;
  }
}