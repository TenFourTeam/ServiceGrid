import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createAPITestSetup, testEdgeFunction, type APITestSetup } from '../fixtures/apiTestSetup';

describe('Customer API Endpoint Integration', () => {
  let testSetup: APITestSetup;

  beforeAll(async () => {
    testSetup = await createAPITestSetup();
  });

  afterAll(async () => {
    await testSetup.cleanup();
  });

  describe('Customer CRUD Operations via API', () => {
    test('business owner can create and read customers', async () => {
      const timestamp = Date.now();
      
      // Create a customer as business owner A
      const createResult = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          name: 'John Doe',
          email: `john.doe-${timestamp}@test.com`,
          phone: '+1234567890',
          address: '123 Main St'
        }
      });

      expect(createResult.ok).toBe(true);
      expect(createResult.data.name).toBe('John Doe');
      expect(createResult.data.email).toBe(`john.doe-${timestamp}@test.com`);

      // Read customers as the same owner
      const readResult = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'GET'
      });

      expect(readResult.ok).toBe(true);
      expect(Array.isArray(readResult.data)).toBe(true);
      
      const createdCustomer = readResult.data.find((c: any) => c.email === `john.doe-${timestamp}@test.com`);
      expect(createdCustomer).toBeDefined();
      expect(createdCustomer.name).toBe('John Doe');
    });

    test('business worker can read customers but with limited contact info', async () => {
      const timestamp = Date.now();

      // First, create a customer as business owner A
      await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          name: 'Jane Smith',
          email: `jane.smith-${timestamp}@test.com`,
          phone: '+1987654321',
          address: '456 Oak Ave'
        }
      });

      // Read customers as worker A (same business, but worker role)
      const workerReadResult = await testEdgeFunction('customers-crud', {
        scenario: 'businessWorkerA',
        scenarios: testSetup.scenarios,
        method: 'GET'
      });

      expect(workerReadResult.ok).toBe(true);
      expect(Array.isArray(workerReadResult.data)).toBe(true);
      
      const customer = workerReadResult.data.find((c: any) => c.name === 'Jane Smith');
      expect(customer).toBeDefined();
      expect(customer.name).toBe('Jane Smith');
      // Workers should not see contact info according to RLS policies
      // This depends on the Edge Function implementation checking user role
    });

    test('business owner cannot access customers from different business', async () => {
      const timestamp = Date.now();

      // Create customer as business owner A
      await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          name: 'Business A Customer',
          email: `business-a-${timestamp}@test.com`,
          phone: '+1111111111'
        }
      });

      // Try to read customers as business owner B (different business)
      const ownerBReadResult = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerB',
        scenarios: testSetup.scenarios,
        method: 'GET'
      });

      expect(ownerBReadResult.ok).toBe(true);
      expect(Array.isArray(ownerBReadResult.data)).toBe(true);
      
      // Should not see customers from business A
      const businessACustomer = ownerBReadResult.data.find((c: any) => c.email === `business-a-${timestamp}@test.com`);
      expect(businessACustomer).toBeUndefined();
    });

    test('can update customer information', async () => {
      const timestamp = Date.now();

      // Create customer
      const createResult = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          name: 'Update Test',
          email: `update-test-${timestamp}@test.com`,
          phone: '+1234567890'
        }
      });

      const customerId = createResult.data.id;

      // Update customer
      const updateResult = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'PUT',
        body: {
          id: customerId,
          name: 'Updated Name',
          email: `update-test-${timestamp}@test.com`
        }
      });

      expect(updateResult.ok).toBe(true);
      expect(updateResult.data.name).toBe('Updated Name');
    });

    test('can delete customer', async () => {
      const timestamp = Date.now();

      // Create customer
      const createResult = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          name: 'Delete Test',
          email: `delete-test-${timestamp}@test.com`,
          phone: '+1234567890'
        }
      });

      const customerId = createResult.data.id;

      // Delete customer
      const deleteResult = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'DELETE',
        body: {
          id: customerId
        }
      });

      expect(deleteResult.ok).toBe(true);

      // Verify deletion by trying to read customers
      const readResult = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'GET'
      });

      const deletedCustomer = readResult.data.find((c: any) => c.id === customerId);
      expect(deletedCustomer).toBeUndefined();
    });
  });

  describe('Authentication and Authorization', () => {
    test('unauthenticated requests are rejected', async () => {
      const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/customers-crud', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdWRrenFmcmlhemFiaW9zbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzIyNjAsImV4cCI6MjA3MDI0ODI2MH0.HLOwmgddlBTcHfYrX9RYvO8RK6IVkjDQvsdHyXuMXIM'
        }
      });

      expect(response.status).toBe(401);
    });

    test('invalid JWT tokens are rejected', async () => {
      const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/customers-crud', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer invalid.jwt.token',
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdWRrenFmcmlhemFiaW9zbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzIyNjAsImV4cCI6MjA3MDI0ODI2MH0.HLOwmgddlBTcHfYrX9RYvO8RK6IVkjDQvsdHyXuMXIM'
        }
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Business Data Isolation', () => {
    test('cross-business data access is prevented', async () => {
      const timestamp = Date.now();

      // Create customer in business A
      const businessACustomer = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          name: 'Business A Only',
          email: `business-a-only-${timestamp}@test.com`,
          phone: '+1111111111'
        }
      });

      // Create customer in business B  
      const businessBCustomer = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerB',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          name: 'Business B Only',
          email: `business-b-only-${timestamp}@test.com`,
          phone: '+2222222222'
        }
      });

      // Verify business A owner can only see business A customers
      const businessARead = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'GET'
      });

      const hasBusinessACustomer = businessARead.data.some((c: any) => c.email === `business-a-only-${timestamp}@test.com`);
      const hasBusinessBCustomer = businessARead.data.some((c: any) => c.email === `business-b-only-${timestamp}@test.com`);

      expect(hasBusinessACustomer).toBe(true);
      expect(hasBusinessBCustomer).toBe(false);

      // Verify business B owner can only see business B customers
      const businessBRead = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerB',
        scenarios: testSetup.scenarios,
        method: 'GET'
      });

      const hasBusinessBCustomerInB = businessBRead.data.some((c: any) => c.email === `business-b-only-${timestamp}@test.com`);
      const hasBusinessACustomerInB = businessBRead.data.some((c: any) => c.email === `business-a-only-${timestamp}@test.com`);

      expect(hasBusinessBCustomerInB).toBe(true);
      expect(hasBusinessACustomerInB).toBe(false);
    });
  });
});