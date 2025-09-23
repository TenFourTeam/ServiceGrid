import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createTestSetup, supabaseAdmin, type TestSetup } from '../fixtures/authTestSetup';

describe('Customer API Integration', () => {
  let testSetup: TestSetup;

  beforeAll(async () => {
    // Create complete test environment with proper auth setup
    testSetup = await createTestSetup();
  });

  afterAll(async () => {
    // Clean up all test data
    await testSetup.cleanup();
  });

  describe('Customer CRUD Operations', () => {
    test('creates customer with valid data', async () => {
      const customerData = {
        business_id: testSetup.business.id,
        owner_id: testSetup.user.id,
        name: 'John Doe',
        email: `customer-${Date.now()}@test.com`,
        phone: '+1234567890',
        address: '123 Main St',
      };

      const { data, error } = await supabaseAdmin
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.email).toBe(customerData.email);
      expect(data?.name).toBe(customerData.name);
    });

    test('prevents duplicate email within same business', async () => {
      const customerData = {
        business_id: testSetup.business.id,
        owner_id: testSetup.user.id,
        name: 'Duplicate Test',
        email: `duplicate-${Date.now()}@test.com`,
        phone: '+1234567890',
      };

      // Insert first customer
      await supabaseAdmin.from('customers').insert(customerData);

      // Try to insert duplicate
      const { error } = await supabaseAdmin
        .from('customers')
        .insert(customerData);

      expect(error).toBeDefined();
      expect(error?.message).toContain('duplicate');
    });

    test('allows same email in different businesses', async () => {
      const email = `same-email-${Date.now()}@test.com`;
      const otherBusinessId = crypto.randomUUID();
      const otherOwnerId = crypto.randomUUID();

      // Create another business
      await supabaseAdmin.from('businesses').insert({
        id: otherBusinessId,
        name: 'Other Business',
        owner_id: otherOwnerId,
        slug: `other-business-${Date.now()}`
      });

      const customerData1 = {
        business_id: testSetup.business.id,
        owner_id: testSetup.user.id,
        name: 'Customer 1',
        email: email,
        phone: '+1234567890',
      };

      const customerData2 = {
        business_id: otherBusinessId,
        owner_id: otherOwnerId,
        name: 'Customer 2',
        email: email,
        phone: '+1234567891',
      };

      const { error: error1 } = await supabaseAdmin.from('customers').insert(customerData1);
      const { error: error2 } = await supabaseAdmin.from('customers').insert(customerData2);

      expect(error1).toBeNull();
      expect(error2).toBeNull();
    });

    test('updates customer information', async () => {
      // First create a customer
      const originalEmail = `update-test-${Date.now()}@test.com`;
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .insert({
          business_id: testSetup.business.id,
          owner_id: testSetup.user.id,
          name: 'Original Name',
          email: originalEmail,
          phone: '+1234567890',
        })
        .select()
        .single();

      // Update the customer
      const updatedName = 'Updated Name';
      const { data: updated, error } = await supabaseAdmin
        .from('customers')
        .update({ name: updatedName })
        .eq('id', customer?.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated?.name).toBe(updatedName);
      expect(updated?.email).toBe(originalEmail); // Should remain unchanged
    });

    test('deletes customer', async () => {
      // First create a customer
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .insert({
          business_id: testSetup.business.id,
          owner_id: testSetup.user.id,
          name: 'Delete Test',
          email: `delete-test-${Date.now()}@test.com`,
          phone: '+1234567890',
        })
        .select()
        .single();

      // Delete the customer
      const { error } = await supabaseAdmin
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

  describe('Customer Search and Filtering', () => {
    test('searches customers by name', async () => {
      const timestamp = Date.now();
      // Create multiple test customers
      await supabaseAdmin.from('customers').insert([
        {
          business_id: testSetup.business.id,
          owner_id: testSetup.user.id,
          name: 'John Smith',
          email: `john.smith-${timestamp}@test.com`,
          phone: '+1555000001',
        },
        {
          business_id: testSetup.business.id,
          owner_id: testSetup.user.id,
          name: 'Jane Doe',
          email: `jane.doe-${timestamp}@test.com`,
          phone: '+1555000002',
        },
        {
          business_id: testSetup.business.id,
          owner_id: testSetup.user.id,
          name: 'Bob Johnson',
          email: `bob.johnson-${timestamp}@test.com`,
          phone: '+1555000003',
        },
      ]);

      // Search for customers with "John" in the name
      const { data, error } = await supabaseAdmin
        .from('customers')
        .select()
        .eq('business_id', testSetup.business.id)
        .ilike('name', '%john%');

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThanOrEqual(2); // John Smith and Bob Johnson
      const names = data?.map(c => c.name) || [];
      expect(names.some(name => name.includes('John'))).toBe(true);
    });

    test('filters customers by business', async () => {
      const timestamp = Date.now();
      const otherBusinessId = crypto.randomUUID();
      const otherOwnerId = crypto.randomUUID();

      // Create another business
      await supabaseAdmin.from('businesses').insert({
        id: otherBusinessId,
        name: 'Other Business Filter',
        owner_id: otherOwnerId,
        slug: `other-filter-business-${timestamp}`
      });

      // Create customers in different businesses
      await supabaseAdmin.from('customers').insert([
        {
          business_id: testSetup.business.id,
          owner_id: testSetup.user.id,
          name: 'Customer 1',
          email: `customer1-${timestamp}@test.com`,
          phone: '+1555000001',
        },
        {
          business_id: otherBusinessId,
          owner_id: otherOwnerId,
          name: 'Customer 2',
          email: `customer2-${timestamp}@test.com`,
          phone: '+1555000002',
        },
      ]);

      // Query customers for specific business only
      const { data, error } = await supabaseAdmin
        .from('customers')
        .select()
        .eq('business_id', testSetup.business.id);

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThanOrEqual(1);
      // All customers should belong to our test business
      data?.forEach(customer => {
        expect(customer.business_id).toBe(testSetup.business.id);
      });
    });
  });
});