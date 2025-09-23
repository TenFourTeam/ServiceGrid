import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createAPITestSetup, testEdgeFunction, type APITestSetup } from '../fixtures/apiTestSetup';

describe('Quote API Endpoint Integration', () => {
  let testSetup: APITestSetup;

  beforeAll(() => {
    testSetup = createAPITestSetup();
  });

  describe('Quote CRUD Operations via API', () => {
    test('business owner can create quotes with line items', async () => {
      const timestamp = Date.now();

      // First create a customer for the quote
      const customerResult = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          name: 'Quote Customer',
          email: `quote-customer-${timestamp}@test.com`,
          phone: '+1234567890'
        }
      });

      expect(customerResult.ok).toBe(true);
      const customerId = customerResult.data.id;

      // Create quote with line items
      const quoteResult = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          customer_id: customerId,
          status: 'Draft',
          subtotal: 10000,
          total: 11000,
          tax_rate: 0.1,
          line_items: [
            {
              name: 'Service 1',
              qty: 2,
              unit_price: 5000,
              line_total: 10000,
              position: 0
            }
          ]
        }
      });

      expect(quoteResult.ok).toBe(true);
      expect(quoteResult.data.customer_id).toBe(customerId);
      expect(quoteResult.data.status).toBe('Draft');
      expect(quoteResult.data.total).toBe(11000);
    });

    test('business owner can read their quotes', async () => {
      // Read quotes as business owner A
      const quotesResult = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'GET'
      });

      expect(quotesResult.ok).toBe(true);
      expect(Array.isArray(quotesResult.data)).toBe(true);
    });

    test('business worker can read quotes from same business', async () => {
      // Read quotes as worker A (same business as owner A)
      const quotesResult = await testEdgeFunction('quotes-crud', {
        scenario: 'businessWorkerA',
        scenarios: testSetup.scenarios,
        method: 'GET'
      });

      expect(quotesResult.ok).toBe(true);
      expect(Array.isArray(quotesResult.data)).toBe(true);
    });

    test('business owner cannot access quotes from different business', async () => {
      const timestamp = Date.now();

      // Create customer and quote in business A
      const customerA = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          name: 'Business A Customer',
          email: `business-a-${timestamp}@test.com`,
          phone: '+1111111111'
        }
      });

      const quoteA = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          customer_id: customerA.data.id,
          status: 'Draft',
          subtotal: 5000,
          total: 5000,
          line_items: []
        }
      });

      // Create customer and quote in business B
      const customerB = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerB',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          name: 'Business B Customer',
          email: `business-b-${timestamp}@test.com`,
          phone: '+2222222222'
        }
      });

      const quoteB = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerB',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          customer_id: customerB.data.id,
          status: 'Draft',
          subtotal: 7000,
          total: 7000,
          line_items: []
        }
      });

      // Verify business A owner can only see business A quotes
      const businessAQuotes = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'GET'
      });

      const hasQuoteA = businessAQuotes.data.some((q: any) => q.id === quoteA.data.id);
      const hasQuoteB = businessAQuotes.data.some((q: any) => q.id === quoteB.data.id);

      expect(hasQuoteA).toBe(true);
      expect(hasQuoteB).toBe(false);

      // Verify business B owner can only see business B quotes
      const businessBQuotes = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerB',
        scenarios: testSetup.scenarios,
        method: 'GET'
      });

      const hasQuoteBInB = businessBQuotes.data.some((q: any) => q.id === quoteB.data.id);
      const hasQuoteAInB = businessBQuotes.data.some((q: any) => q.id === quoteA.data.id);

      expect(hasQuoteBInB).toBe(true);
      expect(hasQuoteAInB).toBe(false);
    });

    test('can update quote status', async () => {
      const timestamp = Date.now();

      // Create customer and quote
      const customerResult = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          name: 'Update Test Customer',
          email: `update-test-${timestamp}@test.com`,
          phone: '+1234567890'
        }
      });

      const quoteResult = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          customer_id: customerResult.data.id,
          status: 'Draft',
          subtotal: 5000,
          total: 5000,
          line_items: []
        }
      });

      // Update quote status
      const updateResult = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'PUT',
        body: {
          id: quoteResult.data.id,
          status: 'Sent'
        }
      });

      expect(updateResult.ok).toBe(true);
      expect(updateResult.data.status).toBe('Sent');
    });

    test('can delete quote', async () => {
      const timestamp = Date.now();

      // Create customer and quote
      const customerResult = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          name: 'Delete Test Customer',
          email: `delete-test-${timestamp}@test.com`,
          phone: '+1234567890'
        }
      });

      const quoteResult = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          customer_id: customerResult.data.id,
          status: 'Draft',
          subtotal: 5000,
          total: 5000,
          line_items: []
        }
      });

      // Delete quote
      const deleteResult = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'DELETE',
        body: {
          id: quoteResult.data.id
        }
      });

      expect(deleteResult.ok).toBe(true);

      // Verify deletion
      const quotesResult = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'GET'
      });

      const deletedQuote = quotesResult.data.find((q: any) => q.id === quoteResult.data.id);
      expect(deletedQuote).toBeUndefined();
    });
  });

  describe('Quote Status Transitions', () => {
    test('can transition quote from Draft to Sent to Approved', async () => {
      const timestamp = Date.now();

      // Create customer and quote
      const customerResult = await testEdgeFunction('customers-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          name: 'Status Test Customer',
          email: `status-test-${timestamp}@test.com`,
          phone: '+1234567890'
        }
      });

      const quoteResult = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'POST',
        body: {
          customer_id: customerResult.data.id,
          status: 'Draft',
          subtotal: 10000,
          total: 11000,
          tax_rate: 0.1,
          line_items: [
            {
              name: 'Service 1',
              qty: 1,
              unit_price: 10000,
              line_total: 10000,
              position: 0
            }
          ]
        }
      });

      const quoteId = quoteResult.data.id;

      // Transition to Sent
      const sentResult = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'PUT',
        body: {
          id: quoteId,
          status: 'Sent'
        }
      });

      expect(sentResult.ok).toBe(true);
      expect(sentResult.data.status).toBe('Sent');

      // Transition to Approved
      const approvedResult = await testEdgeFunction('quotes-crud', {
        scenario: 'businessOwnerA',
        scenarios: testSetup.scenarios,
        method: 'PUT',
        body: {
          id: quoteId,
          status: 'Approved'
        }
      });

      expect(approvedResult.ok).toBe(true);
      expect(approvedResult.data.status).toBe('Approved');
    });
  });

  describe('Authentication and Authorization for Quotes', () => {
    test('unauthenticated requests to quotes are rejected', async () => {
      const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/quotes-crud', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdWRrenFmcmlhemFiaW9zbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzIyNjAsImV4cCI6MjA3MDI0ODI2MH0.HLOwmgddlBTcHfYrX9RYvO8RK6IVkjDQvsdHyXuMXIM'
        }
      });

      expect(response.status).toBe(401);
    });

    test('invalid JWT tokens for quotes are rejected', async () => {
      const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/quotes-crud', {
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
});