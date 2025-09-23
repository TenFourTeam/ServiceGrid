import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { vi } from 'vitest';

// Use service role key for integration tests to bypass RLS when setting up test data
const SUPABASE_URL = 'https://ijudkzqfriazabiosnvb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

// Service role client for test data setup (bypasses RLS)
export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Regular client for testing RLS behavior
export const supabaseClient = createClient<Database>(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdWRrenFmcmlhemFiaW9zbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzIyNjAsImV4cCI6MjA3MDI0ODI2MH0.HLOwmgddlBTcHfYrX9RYvO8RK6IVkjDQvsdHyXuMXIM');

export interface TestUser {
  id: string;
  clerk_user_id: string;
  email: string;
  full_name: string;
}

export interface TestBusiness {
  id: string;
  name: string;
  owner_id: string;
  slug: string;
}

export interface TestSetup {
  user: TestUser;
  business: TestBusiness;
  cleanup: () => Promise<void>;
}

/**
 * Creates a complete test setup with authenticated user, business, and membership
 */
export async function createTestSetup(): Promise<TestSetup> {
  const testUserId = crypto.randomUUID();
  const testBusinessId = crypto.randomUUID();
  const clerkUserId = `clerk_${testUserId}`;
  
  // Create user profile
  const user: TestUser = {
    id: testUserId,
    clerk_user_id: clerkUserId,
    email: `test+${Date.now()}@example.com`,
    full_name: 'Test User'
  };

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert(user);

  if (profileError) {
    throw new Error(`Failed to create test profile: ${profileError.message}`);
  }

  // Create business
  const business: TestBusiness = {
    id: testBusinessId,
    name: 'Test Business',
    owner_id: testUserId, // Link to profiles.id, not auth.users.id
    slug: `test-business-${Date.now()}`
  };

  const { error: businessError } = await supabaseAdmin
    .from('businesses')
    .insert(business);

  if (businessError) {
    throw new Error(`Failed to create test business: ${businessError.message}`);
  }

  // Create business membership
  const { error: memberError } = await supabaseAdmin
    .from('business_members')
    .insert({
      business_id: testBusinessId,
      user_id: testUserId,
      role: 'owner',
      joined_at: new Date().toISOString()
    });

  if (memberError) {
    throw new Error(`Failed to create business membership: ${memberError.message}`);
  }

  // Update profile with default business
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ default_business_id: testBusinessId })
    .eq('id', testUserId);

  if (updateError) {
    throw new Error(`Failed to update profile with default business: ${updateError.message}`);
  }

  const cleanup = async () => {
    // Clean up in reverse order to handle foreign key constraints
    await supabaseAdmin.from('business_members').delete().eq('user_id', testUserId);
    await supabaseAdmin.from('businesses').delete().eq('id', testBusinessId);
    await supabaseAdmin.from('profiles').delete().eq('id', testUserId);
  };

  return { user, business, cleanup };
}

/**
 * Creates an authenticated Supabase client for testing RLS policies
 */
export function createAuthenticatedClient(clerkUserId: string) {
  // Mock JWT token with the required claims for RLS functions
  const mockJwt = {
    sub: clerkUserId,
    aud: 'authenticated',
    role: 'authenticated',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  // Create client with mocked auth
  const client = createClient<Database>(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdWRrenFmcmlhemFiaW9zbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzIyNjAsImV4cCI6MjA3MDI0ODI2MH0.HLOwmgddlBTcHfYrX9RYvO8RK6IVkjDQvsdHyXuMXIM');

  // Mock the auth methods
  vi.spyOn(client.auth, 'getUser').mockResolvedValue({
    data: {
      user: {
        id: clerkUserId,
        aud: 'authenticated',
        role: 'authenticated',
        email: `${clerkUserId}@test.com`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email_confirmed_at: new Date().toISOString(),
        last_sign_in_at: new Date().toISOString(),
        app_metadata: {},
        user_metadata: {},
        identities: [],
        factors: []
      }
    },
    error: null
  });

  vi.spyOn(client.auth, 'getSession').mockResolvedValue({
    data: {
      session: {
        access_token: `mock_token_${clerkUserId}`,
        refresh_token: 'mock_refresh',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: clerkUserId,
          aud: 'authenticated',
          role: 'authenticated',
          email: `${clerkUserId}@test.com`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          identities: [],
          factors: []
        }
      }
    },
    error: null
  });

  return client;
}

/**
 * Mock useAuthApi hook for integration tests
 */
export function mockUseAuthApi(clerkUserId: string) {
  const authApi = {
    invoke: vi.fn().mockImplementation(async (functionName: string, options: any = {}) => {
      // Mock the edge function calls that would normally include authentication
      const mockResponse = { data: null, error: null };
      
      switch (functionName) {
        case 'customers-crud':
          if (options.method === 'POST') {
            mockResponse.data = { id: crypto.randomUUID(), ...options.body };
          }
          break;
        case 'quotes-crud':
          if (options.method === 'POST') {
            mockResponse.data = { id: crypto.randomUUID(), ...options.body };
          }
          break;
        default:
          mockResponse.data = { success: true };
      }
      
      return mockResponse;
    })
  };

  vi.doMock('@/hooks/useAuthApi', () => ({
    useAuthApi: () => authApi
  }));

  return authApi;
}