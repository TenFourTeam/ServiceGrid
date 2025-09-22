import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { TestScenarios, createMockAuthToken } from '../fixtures/scenarios';

// Mock the auth context for integration tests
const mockAuth = {
  userId: TestScenarios.businessOwner.clerk_user_id,
  getToken: () => Promise.resolve(createMockAuthToken()),
};

describe('Customer API Integration', () => {
  beforeEach(async () => {
    // Clean up test data before each test
    await supabase.from('customers').delete().eq('email', TestScenarios.defaultCustomer.email);
  });

  afterEach(async () => {
    // Clean up test data after each test
    await supabase.from('customers').delete().eq('email', TestScenarios.defaultCustomer.email);
  });

  describe('Customer CRUD Operations', () => {
    test('creates customer with valid data', async () => {
      const customerData = {
        business_id: TestScenarios.defaultBusiness.id,
        name: TestScenarios.defaultCustomer.name,
        email: TestScenarios.defaultCustomer.email,
        phone: TestScenarios.defaultCustomer.phone,
        address: TestScenarios.defaultCustomer.address,
      };

      const { data, error } = await supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.email).toBe(TestScenarios.defaultCustomer.email);
      expect(data?.name).toBe(TestScenarios.defaultCustomer.name);
    });

    test('prevents duplicate email within same business', async () => {
      const customerData = {
        business_id: TestScenarios.defaultBusiness.id,
        name: TestScenarios.defaultCustomer.name,
        email: TestScenarios.defaultCustomer.email,
        phone: TestScenarios.defaultCustomer.phone,
      };

      // Insert first customer
      await supabase.from('customers').insert(customerData);

      // Try to insert duplicate
      const { error } = await supabase
        .from('customers')
        .insert(customerData);

      expect(error).toBeDefined();
      expect(error?.message).toContain('unique');
    });

    test('allows same email in different businesses', async () => {
      const customerData1 = {
        business_id: TestScenarios.defaultBusiness.id,
        name: TestScenarios.defaultCustomer.name,
        email: TestScenarios.defaultCustomer.email,
        phone: TestScenarios.defaultCustomer.phone,
      };

      const customerData2 = {
        ...customerData1,
        business_id: 'different_business_id',
      };

      const { error: error1 } = await supabase.from('customers').insert(customerData1);
      const { error: error2 } = await supabase.from('customers').insert(customerData2);

      expect(error1).toBeNull();
      expect(error2).toBeNull();
    });

    test('updates customer information', async () => {
      // First create a customer
      const { data: customer } = await supabase
        .from('customers')
        .insert({
          business_id: TestScenarios.defaultBusiness.id,
          name: TestScenarios.defaultCustomer.name,
          email: TestScenarios.defaultCustomer.email,
          phone: TestScenarios.defaultCustomer.phone,
        })
        .select()
        .single();

      // Update the customer
      const updatedName = 'Jane Doe Updated';
      const { data: updated, error } = await supabase
        .from('customers')
        .update({ name: updatedName })
        .eq('id', customer?.id)
        .select()
        .single();

      expect(error).toBeNull();
      expect(updated?.name).toBe(updatedName);
      expect(updated?.email).toBe(TestScenarios.defaultCustomer.email); // Should remain unchanged
    });

    test('deletes customer', async () => {
      // First create a customer
      const { data: customer } = await supabase
        .from('customers')
        .insert({
          business_id: TestScenarios.defaultBusiness.id,
          name: TestScenarios.defaultCustomer.name,
          email: TestScenarios.defaultCustomer.email,
          phone: TestScenarios.defaultCustomer.phone,
        })
        .select()
        .single();

      // Delete the customer
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer?.id);

      expect(error).toBeNull();

      // Verify deletion
      const { data: deleted } = await supabase
        .from('customers')
        .select()
        .eq('id', customer?.id);

      expect(deleted).toHaveLength(0);
    });
  });

  describe('Customer Search and Filtering', () => {
    test('searches customers by name', async () => {
      // Create multiple test customers
      await supabase.from('customers').insert([
        {
          business_id: TestScenarios.defaultBusiness.id,
          name: 'John Smith',
          email: 'john.smith@example.com',
          phone: '555-0001',
        },
        {
          business_id: TestScenarios.defaultBusiness.id,
          name: 'Jane Doe',
          email: 'jane.doe@example.com',
          phone: '555-0002',
        },
        {
          business_id: TestScenarios.defaultBusiness.id,
          name: 'Bob Johnson',
          email: 'bob.johnson@example.com',
          phone: '555-0003',
        },
      ]);

      // Search for customers with "John" in the name
      const { data, error } = await supabase
        .from('customers')
        .select()
        .eq('business_id', TestScenarios.defaultBusiness.id)
        .ilike('name', '%john%');

      expect(error).toBeNull();
      expect(data).toHaveLength(2); // John Smith and Bob Johnson
      expect(data?.map(c => c.name)).toEqual(
        expect.arrayContaining(['John Smith', 'Bob Johnson'])
      );
    });

    test('filters customers by business', async () => {
      // Create customers in different businesses
      await supabase.from('customers').insert([
        {
          business_id: TestScenarios.defaultBusiness.id,
          name: 'Customer 1',
          email: 'customer1@example.com',
          phone: '555-0001',
        },
        {
          business_id: 'different_business',
          name: 'Customer 2',
          email: 'customer2@example.com',
          phone: '555-0002',
        },
      ]);

      // Query customers for specific business only
      const { data, error } = await supabase
        .from('customers')
        .select()
        .eq('business_id', TestScenarios.defaultBusiness.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data?.[0].name).toBe('Customer 1');
    });
  });
});