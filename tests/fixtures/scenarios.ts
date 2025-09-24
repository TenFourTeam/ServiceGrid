export const TestScenarios = {
  // Basic business setup
  defaultBusiness: {
    id: 'bus_123',
    name: 'Test Business',
    owner_id: 'user_123',
    slug: 'test-business',
  },

  // User profiles
  businessOwner: {
    id: 'user_123',
    clerk_user_id: 'clerk_owner',
    email: 'owner@test.com',
    full_name: 'Test Owner',
    role: 'owner' as const,
  },

  businessWorker: {
    id: 'user_456',
    clerk_user_id: 'clerk_worker',
    email: 'worker@test.com', 
    full_name: 'Test Worker',
    role: 'worker' as const,
  },

  // Sample customer
  defaultCustomer: {
    id: 'cust_123',
    business_id: 'bus_123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    address: '123 Main St',
  },

  // Sample quote
  defaultQuote: {
    id: 'quote_123', 
    business_id: 'bus_123',
    customer_id: 'cust_123',
    quote_number: 'EST001',
    total_amount: 1000,
    status: 'Draft' as const,
    line_items: [
      {
        description: 'Service A',
        quantity: 2,
        unit_price: 500,
        total: 1000,
      }
    ],
  },

  // Payment amounts for testing
  paymentAmounts: {
    small: 999, // $9.99 in cents
    medium: 5000, // $50.00
    large: 100000, // $1000.00
    maxStripe: 9999999, // $99,999.99 (Stripe max for most scenarios)
  },
}

export function createMockAuthToken(userId: string = 'clerk_owner'): string {
  return `mock-jwt-${userId}`;
}

export function createTestEnvironment() {
  return {
    supabaseUrl: 'https://ijudkzqfriazabiosnvb.supabase.co',
    supabaseKey: 'test-anon-key',
    baseUrl: 'http://localhost:4173',
  };
}