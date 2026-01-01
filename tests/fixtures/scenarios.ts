export const TestScenarios = {
  // Generate proper UUIDs for realistic testing
  generateTestIds: () => ({
    userId: crypto.randomUUID(),
    businessId: crypto.randomUUID(),
    customerId: crypto.randomUUID(),
    quoteId: crypto.randomUUID(),
  }),

  // Basic business setup - using proper UUID format
  defaultBusiness: {
    id: crypto.randomUUID(),
    name: 'Test Business',
    owner_id: crypto.randomUUID(), // This should reference profiles.id
    slug: 'test-business',
  },

  // User profiles with proper schema fields
  businessOwner: {
    id: crypto.randomUUID(),
    email: 'owner@test.com',
    full_name: 'Test Owner',
    role: 'owner' as const,
  },

  businessWorker: {
    id: crypto.randomUUID(),
    email: 'worker@test.com', 
    full_name: 'Test Worker',
    role: 'worker' as const,
  },

  // Sample customer with required owner_id field
  defaultCustomer: {
    id: crypto.randomUUID(),
    business_id: crypto.randomUUID(),
    owner_id: crypto.randomUUID(), // Required by schema
    name: 'John Doe',
    email: 'john@test.example.com',
    phone: '+1234567890',
    address: '123 Main St',
  },

  // Sample quote with correct schema fields
  defaultQuote: {
    id: crypto.randomUUID(), 
    business_id: crypto.randomUUID(),
    customer_id: crypto.randomUUID(),
    owner_id: crypto.randomUUID(), // Required by schema
    number: 'EST001', // Correct field name
    subtotal: 1000, // In cents
    total: 1080, // In cents (with tax)
    tax_rate: 0.08,
    status: 'Draft' as const,
    // Remove line_items as they're stored in separate table
  },

  // Sample line items for quotes (stored in quote_line_items table)
  defaultLineItems: [
    {
      id: crypto.randomUUID(),
      quote_id: crypto.randomUUID(), // Will be set to actual quote ID
      owner_id: crypto.randomUUID(), // Required by schema
      name: 'Service A',
      qty: 2,
      unit_price: 500, // In cents
      line_total: 1000, // In cents
      position: 0,
    }
  ],

  // Payment amounts for testing
  paymentAmounts: {
    small: 999, // $9.99 in cents
    medium: 5000, // $50.00
    large: 100000, // $1000.00
    maxStripe: 9999999, // $99,999.99 (Stripe max for most scenarios)
  },
}

export function createMockSessionToken(userId: string = 'test_user'): string {
  return `mock-session-${userId}`;
}

export function createTestEnvironment() {
  return {
    supabaseUrl: 'https://ijudkzqfriazabiosnvb.supabase.co',
    supabaseKey: 'test-anon-key',
    baseUrl: 'http://localhost:4173',
  };
}