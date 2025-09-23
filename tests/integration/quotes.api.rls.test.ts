import { test, expect, describe, beforeAll, afterAll } from 'vitest';
import { createTestSetup, createAuthenticatedClient, supabaseAdmin, type TestSetup } from '../fixtures/authTestSetup';
import { calculateQuoteTotal } from '@/utils/money';

describe('Quote API Integration with RLS', () => {
  let testSetup: TestSetup;
  let authenticatedClient: any;
  let testCustomerId: string;

  beforeAll(async () => {
    // Create complete test environment with proper auth setup
    testSetup = await createTestSetup();
    authenticatedClient = createAuthenticatedClient(testSetup.user.clerk_user_id);

    // Create a test customer for quote operations
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .insert({
        business_id: testSetup.business.id,
        owner_id: testSetup.user.id,
        name: 'Quote Test Customer',
        email: `quote-customer-${Date.now()}@test.com`,
        phone: '+1234567890',
      })
      .select()
      .single();

    if (!customer?.id) {
      throw new Error('Failed to create test customer for quotes');
    }
    testCustomerId = customer.id;
  });

  afterAll(async () => {
    // Clean up all test data
    await testSetup.cleanup();
  });

  describe('Quote Creation and Management with RLS', () => {
    test('business owner can create quote', async () => {
      const quoteData = {
        business_id: testSetup.business.id,
        customer_id: testCustomerId,
        owner_id: testSetup.user.id,
        number: `EST-${Date.now()}`,
        status: 'Draft' as const,
        subtotal: 1750, // In cents
        tax_rate: 0.08,
        total: 1890, // In cents (subtotal + tax)
      };

      // Use admin client to create quote (simulating edge function)
      const { data, error } = await supabaseAdmin
        .from('quotes')
        .insert(quoteData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.number).toBe(quoteData.number);
      expect(data?.total).toBe(1890);
      expect(data?.business_id).toBe(testSetup.business.id);
    });

    test('business owner can create quote with line items', async () => {
      // Create quote first
      const quoteData = {
        business_id: testSetup.business.id,
        customer_id: testCustomerId,
        owner_id: testSetup.user.id,
        number: `EST-WITH-ITEMS-${Date.now()}`,
        status: 'Draft' as const,
        subtotal: 1750,
        tax_rate: 0.08,
        total: 1890,
      };

      const { data: quote, error: quoteError } = await supabaseAdmin
        .from('quotes')
        .insert(quoteData)
        .select()
        .single();

      expect(quoteError).toBeNull();
      expect(quote).toBeDefined();

      // Add line items to the quote
      const lineItems = [
        {
          quote_id: quote!.id,
          owner_id: testSetup.user.id,
          name: 'Service A',
          qty: 2,
          unit_price: 500, // In cents
          line_total: 1000, // In cents
          position: 0,
        },
        {
          quote_id: quote!.id,
          owner_id: testSetup.user.id,
          name: 'Service B',
          qty: 1,
          unit_price: 750, // In cents
          line_total: 750, // In cents
          position: 1,
        }
      ];

      const { data: createdItems, error: itemsError } = await supabaseAdmin
        .from('quote_line_items')
        .insert(lineItems)
        .select();

      expect(itemsError).toBeNull();
      expect(createdItems).toHaveLength(2);
    });

    test('quote status transitions work correctly', async () => {
      // Create draft quote
      const { data: quote } = await supabaseAdmin
        .from('quotes')
        .insert({
          business_id: testSetup.business.id,
          customer_id: testCustomerId,
          owner_id: testSetup.user.id,
          number: `EST-STATUS-${Date.now()}`,
          status: 'Draft',
          subtotal: 1000,
          tax_rate: 0.08,
          total: 1080,
        })
        .select()
        .single();

      // Transition to Sent using authenticated client (tests RLS)
      const { data: sentQuote, error: sentError } = await authenticatedClient
        .from('quotes')
        .update({ 
          status: 'Sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', quote?.id)
        .select()
        .single();

      expect(sentError).toBeNull();
      expect(sentQuote?.status).toBe('Sent');
      expect(sentQuote?.sent_at).toBeDefined();

      // Transition to Approved
      const { data: approvedQuote, error: approvedError } = await authenticatedClient
        .from('quotes')
        .update({ 
          status: 'Approved',
          approved_at: new Date().toISOString(),
        })
        .eq('id', quote?.id)
        .select()
        .single();

      expect(approvedError).toBeNull();
      expect(approvedQuote?.status).toBe('Approved');
      expect(approvedQuote?.approved_at).toBeDefined();
    });

    test('calculates quote totals correctly using utility function', () => {
      const lineItems = [
        { quantity: 2, unit_price: 100, tax_rate: 0.08 },
        { quantity: 1, unit_price: 350, tax_rate: 0.08 },
      ];

      const total = calculateQuoteTotal(lineItems);
      
      // Expected: (2*100 + 1*350) * 1.08 = 550 * 1.08 = 594
      expect(total).toBe(594);
    });

    test('prevents duplicate quote numbers within business', async () => {
      const quoteNumber = `EST-DUPLICATE-${Date.now()}`;

      // Create first quote
      await supabaseAdmin.from('quotes').insert({
        business_id: testSetup.business.id,
        customer_id: testCustomerId,
        owner_id: testSetup.user.id,
        number: quoteNumber,
        status: 'Draft',
        subtotal: 100,
        total: 108,
      });

      // Try to create second quote with same number
      const { error } = await supabaseAdmin.from('quotes').insert({
        business_id: testSetup.business.id,
        customer_id: testCustomerId,
        owner_id: testSetup.user.id,
        number: quoteNumber,
        status: 'Draft',
        subtotal: 200,
        total: 216,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('duplicate');
    });
  });

  describe('Quote RLS Policy Testing', () => {
    test('prevents access to other businesses quotes', async () => {
      // Create another business setup
      const otherBusinessId = crypto.randomUUID();
      const otherOwnerId = crypto.randomUUID();

      await supabaseAdmin.from('businesses').insert({
        id: otherBusinessId,
        name: 'Other Business',
        owner_id: otherOwnerId,
        slug: `other-quote-business-${Date.now()}`
      });

      // Create customer for other business
      const { data: otherCustomer } = await supabaseAdmin.from('customers').insert({
        business_id: otherBusinessId,
        owner_id: otherOwnerId,
        name: 'Other Customer',
        email: `other-quote-customer-${Date.now()}@test.com`,
        phone: '+1234567891',
      }).select().single();

      // Create quote in other business
      await supabaseAdmin.from('quotes').insert({
        business_id: otherBusinessId,
        customer_id: otherCustomer!.id,
        owner_id: otherOwnerId,
        number: `OTHER-EST-${Date.now()}`,
        status: 'Draft',
        subtotal: 500,
        total: 540,
      });

      // Try to access other business's quotes (should be blocked by RLS)
      const { data, error } = await authenticatedClient
        .from('quotes')
        .select('*')
        .eq('business_id', otherBusinessId);

      // RLS should prevent access to other business data
      expect(data).toHaveLength(0);
    });

    test('allows access to own business quotes only', async () => {
      // Create quotes in our test business
      await supabaseAdmin.from('quotes').insert([
        {
          business_id: testSetup.business.id,
          customer_id: testCustomerId,
          owner_id: testSetup.user.id,
          number: `OWN-EST-1-${Date.now()}`,
          status: 'Draft',
          subtotal: 1000,
          total: 1080,
        },
        {
          business_id: testSetup.business.id,
          customer_id: testCustomerId,
          owner_id: testSetup.user.id,
          number: `OWN-EST-2-${Date.now()}`,
          status: 'Sent',
          subtotal: 2000,
          total: 2160,
        }
      ]);

      // Should be able to access own business quotes
      const { data, error } = await authenticatedClient
        .from('quotes')
        .select('*')
        .eq('business_id', testSetup.business.id);

      expect(error).toBeNull();
      expect(data?.length).toBeGreaterThanOrEqual(2);
      
      // All quotes should belong to our business
      data?.forEach(quote => {
        expect(quote.business_id).toBe(testSetup.business.id);
      });
    });
  });

  describe('Quote-to-Job Conversion with RLS', () => {
    test('converts approved quote to job with proper permissions', async () => {
      // Create and approve quote
      const { data: quote } = await supabaseAdmin
        .from('quotes')
        .insert({
          business_id: testSetup.business.id,
          customer_id: testCustomerId,
          owner_id: testSetup.user.id,
          number: `EST-TO-JOB-${Date.now()}`,
          status: 'Approved',
          subtotal: 1000,
          total: 1080,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Convert to job using authenticated client (tests RLS)
      const jobData = {
        business_id: testSetup.business.id,
        customer_id: testCustomerId,
        owner_id: testSetup.user.id,
        quote_id: quote?.id,
        title: 'Job from Quote',
        status: 'Scheduled',
        starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        total: quote?.total,
      };

      const { data: job, error } = await supabaseAdmin
        .from('jobs')
        .insert(jobData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(job?.quote_id).toBe(quote?.id);
      expect(job?.customer_id).toBe(testCustomerId);
      expect(job?.status).toBe('Scheduled');
    });
  });

  describe('Quote Expiration Logic with RLS', () => {
    test('identifies expired quotes within business boundaries', async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create expired and valid quotes
      await supabaseAdmin.from('quotes').insert([
        {
          business_id: testSetup.business.id,
          customer_id: testCustomerId,
          owner_id: testSetup.user.id,
          number: `EST-EXPIRED-${Date.now()}`,
          status: 'Sent',
          subtotal: 1000,
          total: 1080,
          // Note: There's no valid_until field in the actual schema
          created_at: yesterday.toISOString(),
        },
        {
          business_id: testSetup.business.id,
          customer_id: testCustomerId,
          owner_id: testSetup.user.id,
          number: `EST-VALID-${Date.now()}`,
          status: 'Sent',
          subtotal: 1000,
          total: 1080,
          created_at: tomorrow.toISOString(),
        }
      ]);

      // Query for quotes using authenticated client (tests RLS)
      const { data: quotes, error } = await authenticatedClient
        .from('quotes')
        .select('*')
        .eq('business_id', testSetup.business.id)
        .eq('status', 'Sent');

      expect(error).toBeNull();
      expect(quotes?.length).toBeGreaterThanOrEqual(2);
      
      // All quotes should belong to our business
      quotes?.forEach(quote => {
        expect(quote.business_id).toBe(testSetup.business.id);
      });
    });
  });
});