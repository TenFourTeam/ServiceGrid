import { createClient } from '@supabase/supabase-js';
import { TestScenarioBuilder, TestContext, callEdgeFunction } from './mockClerkAuth';

const SUPABASE_URL = 'https://ijudkzqfriazabiosnvb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdWRrenFmcmlhemFiaW9zbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzIyNjAsImV4cCI6MjA3MDI0ODI2MH0.HLOwmgddlBTcHfYrX9RYvO8RK6IVkjDQvsdHyXuMXIM';

// Only use service role for test data setup, not for testing RLS
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required for test setup');
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface APITestSetup {
  scenarios: TestScenarioBuilder;
  cleanup: () => Promise<void>;
}

/**
 * Create test data and scenarios for API endpoint testing
 * This setup creates the necessary profiles and businesses in the database
 * so that Edge Functions can resolve user context properly
 */
export async function createAPITestSetup(): Promise<APITestSetup> {
  const scenarios = TestScenarioBuilder.createDefault();
  const createdIds: { table: string; id: string }[] = [];

  try {
    // Create profiles for each test user
    const profiles = [
      {
        id: 'profile_owner_a',
        clerk_user_id: 'user_owner_a',
        email: 'owner-a@test.com',
        full_name: 'Owner A'
      },
      {
        id: 'profile_worker_a', 
        clerk_user_id: 'user_worker_a',
        email: 'worker-a@test.com',
        full_name: 'Worker A'
      },
      {
        id: 'profile_owner_b',
        clerk_user_id: 'user_owner_b', 
        email: 'owner-b@test.com',
        full_name: 'Owner B'
      }
    ];

    for (const profile of profiles) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .insert(profile);
      
      if (error) throw error;
      createdIds.push({ table: 'profiles', id: profile.id });
    }

    // Create businesses
    const businesses = [
      {
        id: 'business_a',
        name: 'Business A',
        owner_id: 'profile_owner_a',
        slug: 'business-a-test'
      },
      {
        id: 'business_b', 
        name: 'Business B',
        owner_id: 'profile_owner_b',
        slug: 'business-b-test'
      }
    ];

    for (const business of businesses) {
      const { error } = await supabaseAdmin
        .from('businesses')
        .insert(business);
        
      if (error) throw error;
      createdIds.push({ table: 'businesses', id: business.id });
    }

    // Create business memberships
    const memberships = [
      {
        business_id: 'business_a',
        user_id: 'profile_owner_a',
        role: 'owner'
      },
      {
        business_id: 'business_a', 
        user_id: 'profile_worker_a',
        role: 'worker'
      },
      {
        business_id: 'business_b',
        user_id: 'profile_owner_b', 
        role: 'owner'
      }
    ];

    for (const membership of memberships) {
      const { error } = await supabaseAdmin
        .from('business_members')
        .insert(membership);
        
      if (error) throw error;
      createdIds.push({ table: 'business_members', id: membership.user_id });
    }

    // Update profiles with default business
    await supabaseAdmin
      .from('profiles')
      .update({ default_business_id: 'business_a' })
      .eq('id', 'profile_owner_a');

    await supabaseAdmin
      .from('profiles')
      .update({ default_business_id: 'business_a' })
      .eq('id', 'profile_worker_a');

    await supabaseAdmin
      .from('profiles')
      .update({ default_business_id: 'business_b' })
      .eq('id', 'profile_owner_b');

    return {
      scenarios,
      cleanup: async () => {
        // Clean up in reverse order
        for (const { table, id } of createdIds.reverse()) {
          if (table === 'business_members') {
            await supabaseAdmin.from(table).delete().eq('user_id', id);
          } else {
            await supabaseAdmin.from(table).delete().eq('id', id);
          }
        }
      }
    };

  } catch (error) {
    // If setup fails, attempt cleanup
    for (const { table, id } of createdIds.reverse()) {
      try {
        if (table === 'business_members') {
          await supabaseAdmin.from(table).delete().eq('user_id', id);
        } else {
          await supabaseAdmin.from(table).delete().eq('id', id);
        }
      } catch {
        // Ignore cleanup errors
      }
    }
    throw error;
  }
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