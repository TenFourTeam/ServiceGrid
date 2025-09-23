import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createTestSetup, createAuthenticatedClient, supabaseAdmin, type TestSetup } from '../fixtures/authTestSetup';

describe('Customer API Integration with RLS', () => {
  let testSetup: TestSetup;
  let authenticatedClient: any;

  beforeAll(async () => {
    // Create complete test environment with proper auth setup
    testSetup = await createTestSetup();
    authenticatedClient = createAuthenticatedClient(testSetup.user.clerk_user_id);
  });

  afterAll(async () => {
    // Clean up all test data
    await testSetup.cleanup();
  });

  describe('Customer CRUD Operations with RLS', () => {
    test('business owner can create customer', async () => {
      const customerData = {
        business_id: testSetup.business.id,
        owner_id: testSetup.user.id,
        name: 'John Doe',
        email: `customer-${Date.now()}@test.com`,
        phone: '+1234567890',
        address: '123 Main St',
      };

      // Use admin client to insert (simulating edge function call)
      const { data, error } = await supabaseAdmin
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.email).toBe(customerData.email);
      expect(data?.name).toBe(customerData.name);
      expect(data?.business_id).toBe(testSetup.business.id);
    });

    test('business owner can read customers', async () => {
      // First create a customer using admin client
      const customerData = {
        business_id: testSetup.business.id,
        owner_id: testSetup.user.id,
        name: 'Jane Smith',
        email: `customer-read-${Date.now()}@test.com`,
        phone: '+1234567891',
      };

      await supabaseAdmin
        .from('customers')
        .insert(customerData);

      // Now test RLS by reading with authenticated client
      const { data, error } = await authenticatedClient
        .from('customers')
        .select('*')
        .eq('business_id', testSetup.business.id);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.length).toBeGreaterThan(0);
    });

    test('business owner can update customers', async () => {
      // Create customer
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .insert({
          business_id: testSetup.business.id,
          owner_id: testSetup.user.id,
          name: 'Update Test',
          email: `update-${Date.now()}@test.com`,
          phone: '+1234567892',
        })
        .select()
        .single();

      // Update customer using authenticated client (tests RLS)
      const updatedName = 'Updated Name';
      const { data: updated, error } = await authenticatedClient
        .from('customers')
        .update({ name: updatedName })
        .eq('id', customer?.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated?.name).toBe(updatedName);
    });

    test('business owner can delete customers', async () => {
      // Create customer
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .insert({
          business_id: testSetup.business.id,
          owner_id: testSetup.user.id,
          name: 'Delete Test',
          email: `delete-${Date.now()}@test.com`,
          phone: '+1234567893',
        })
        .select()
        .single();

      // Delete customer using authenticated client (tests RLS)
      const { error } = await authenticatedClient
        .from('customers')
        .delete()
        .eq('id', customer?.id);

      expect(error).toBeNull();

      // Verify deletion
      const { data: deleted } = await supabaseAdmin
        .from('customers')
        .select()
        .eq('id', customer?.id);

      expect(deleted).toHaveLength(0);
    });
  });

  describe('Customer RLS Policy Testing', () => {
    test('prevents access to other businesses customers', async () => {
      // Create another business and customer
      const otherBusinessId = crypto.randomUUID();
      const otherOwnerId = crypto.randomUUID();

      await supabaseAdmin.from('businesses').insert({
        id: otherBusinessId,
        name: 'Other Business',
        owner_id: otherOwnerId,
        slug: `other-business-${Date.now()}`
      });

      await supabaseAdmin.from('customers').insert({
        business_id: otherBusinessId,
        owner_id: otherOwnerId,
        name: 'Other Customer',
        email: `other-${Date.now()}@test.com`,
        phone: '+1234567894',
      });

      // Try to access other business's customers (should be blocked by RLS)
      const { data, error } = await authenticatedClient
        .from('customers')
        .select('*')
        .eq('business_id', otherBusinessId);

      // RLS should prevent access to other business data
      expect(data).toHaveLength(0);
    });

    test('allows access to own business customers only', async () => {
      // Create customers in our test business
      await supabaseAdmin.from('customers').insert([
        {
          business_id: testSetup.business.id,
          owner_id: testSetup.user.id,
          name: 'Own Customer 1',
          email: `own1-${Date.now()}@test.com`,
          phone: '+1234567895',
        },
        {
          business_id: testSetup.business.id,
          owner_id: testSetup.user.id,
          name: 'Own Customer 2',
          email: `own2-${Date.now()}@test.com`,
          phone: '+1234567896',
        }
      ]);

      // Should be able to access own business customers
      const { data, error } = await authenticatedClient
        .from('customers')
        .select('*')
        .eq('business_id', testSetup.business.id);

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Customer Search and Filtering with RLS', () => {
    test('searches customers by name within business boundaries', async () => {
      // Create test customers
      await supabaseAdmin.from('customers').insert([
        {
          business_id: testSetup.business.id,
          owner_id: testSetup.user.id,
          name: 'John Smith',
          email: `john.smith-${Date.now()}@test.com`,
          phone: '+1234567897',
        },
        {
          business_id: testSetup.business.id,
          owner_id: testSetup.user.id,
          name: 'Jane Doe',
          email: `jane.doe-${Date.now()}@test.com`,
          phone: '+1234567898',
        },
        {
          business_id: testSetup.business.id,
          owner_id: testSetup.user.id,
          name: 'Bob Johnson',
          email: `bob.johnson-${Date.now()}@test.com`,
          phone: '+1234567899',
        },
      ]);

      // Search for customers with "John" in the name (should find John Smith and Bob Johnson)
      const { data, error } = await authenticatedClient
        .from('customers')
        .select('*')
        .eq('business_id', testSetup.business.id)
        .ilike('name', '%john%');

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThanOrEqual(1);
      
      const names = data?.map(c => c.name) || [];
      expect(names.some(name => name.includes('John'))).toBe(true);
    });

    test('filters customers by business ID through RLS', async () => {
      // Query customers for our specific business
      const { data, error } = await authenticatedClient
        .from('customers')
        .select('*')
        .eq('business_id', testSetup.business.id);

      expect(error).toBeNull();
      expect(data).toBeDefined();
      
      // All returned customers should belong to our business
      data?.forEach(customer => {
        expect(customer.business_id).toBe(testSetup.business.id);
      });
    });
  });
});