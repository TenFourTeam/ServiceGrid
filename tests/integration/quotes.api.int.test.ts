import { test, expect, describe, beforeEach, afterEach } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { TestScenarios } from '../fixtures/scenarios';

describe('Quote API Integration', () => {
  let testCustomerId: string;
  let testQuoteId: string;

  beforeEach(async () => {
    // Clean up and create fresh test data
    await supabase.from('quotes').delete().eq('business_id', TestScenarios.defaultBusiness.id);
    await supabase.from('customers').delete().eq('business_id', TestScenarios.defaultBusiness.id);

    // Create test customer
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

    if (!customer?.id) {
      throw new Error('Failed to create test customer');
    }
    testCustomerId = customer.id;
  });

  afterEach(async () => {
    // Clean up test data
    await supabase.from('quotes').delete().eq('business_id', TestScenarios.defaultBusiness.id);
    await supabase.from('customers').delete().eq('business_id', TestScenarios.defaultBusiness.id);
  });

  describe('Quote Creation and Management', () => {
    test('creates quote with line items', async () => {
      const quoteData = {
        business_id: TestScenarios.defaultBusiness.id,
        customer_id: testCustomerId,
        quote_number: 'EST001',
        status: 'Draft' as const,
        line_items: [
          {
            description: 'Service A',
            quantity: 2,
            unit_price: 500,
            total: 1000,
          },
          {
            description: 'Service B',
            quantity: 1,
            unit_price: 750,
            total: 750,
          }
        ],
        subtotal: 1750,
        tax_amount: 140, // 8% tax
        total_amount: 1890,
        valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      };

      const { data, error } = await supabase
        .from('quotes')
        .insert(quoteData)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data?.quote_number).toBe('EST001');
      expect(data?.total_amount).toBe(1890);
      expect(data?.line_items).toHaveLength(2);

      if (!data?.id) {
        throw new Error('Failed to create test quote');
      }
      testQuoteId = data.id;
    });

    test('quote status transitions work correctly', async () => {
      // Create draft quote
      const { data: quote } = await supabase
        .from('quotes')
        .insert({
          business_id: TestScenarios.defaultBusiness.id,
          customer_id: testCustomerId,
          quote_number: 'EST002',
          status: 'Draft',
          line_items: TestScenarios.defaultQuote.line_items,
          total_amount: 1000,
        })
        .select()
        .single();

      // Transition to Sent
      const { data: sentQuote, error: sentError } = await supabase
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
      const { data: approvedQuote, error: approvedError } = await supabase
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

    test('calculates quote totals correctly', () => {
      const lineItems = [
        { description: 'Item 1', quantity: 2, unit_price: 100, total: 200 },
        { description: 'Item 2', quantity: 1, unit_price: 350, total: 350 },
      ];

      const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
      const taxRate = 0.08;
      const taxAmount = Math.round(subtotal * taxRate);
      const totalAmount = subtotal + taxAmount;

      expect(subtotal).toBe(550);
      expect(taxAmount).toBe(44); // 8% of 550
      expect(totalAmount).toBe(594);
    });

    test('prevents duplicate quote numbers within business', async () => {
      const quoteNumber = 'EST003';

      // Create first quote
      await supabase.from('quotes').insert({
        business_id: TestScenarios.defaultBusiness.id,
        customer_id: testCustomerId,
        quote_number: quoteNumber,
        status: 'Draft',
        line_items: [],
        total_amount: 100,
      });

      // Try to create second quote with same number
      const { error } = await supabase.from('quotes').insert({
        business_id: TestScenarios.defaultBusiness.id,
        customer_id: testCustomerId,
        quote_number: quoteNumber,
        status: 'Draft',
        line_items: [],
        total_amount: 200,
      });

      expect(error).toBeDefined();
      expect(error?.message).toContain('unique');
    });
  });

  describe('Quote-to-Job Conversion', () => {
    test('converts approved quote to job', async () => {
      // Create and approve quote
      const { data: quote } = await supabase
        .from('quotes')
        .insert({
          business_id: TestScenarios.defaultBusiness.id,
          customer_id: testCustomerId,
          quote_number: 'EST004',
          status: 'Approved',
          line_items: TestScenarios.defaultQuote.line_items,
          total_amount: 1000,
          approved_at: new Date().toISOString(),
        })
        .select()
        .single();

      // Convert to job
      const jobData = {
        business_id: TestScenarios.defaultBusiness.id,
        customer_id: testCustomerId,
        quote_id: quote?.id,
        title: 'Job from Quote EST004',
        description: 'Converted from approved quote',
        status: 'Scheduled',
        scheduled_start: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      };

      const { data: job, error } = await supabase
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

  describe('Quote Expiration Logic', () => {
    test('identifies expired quotes', async () => {
      // Create expired quote
      const { data: expiredQuote } = await supabase
        .from('quotes')
        .insert({
          business_id: TestScenarios.defaultBusiness.id,
          customer_id: testCustomerId,
          quote_number: 'EST005',
          status: 'Sent',
          line_items: [],
          total_amount: 1000,
          valid_until: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        })
        .select()
        .single();

      // Create valid quote
      const { data: validQuote } = await supabase
        .from('quotes')
        .insert({
          business_id: TestScenarios.defaultBusiness.id,
          customer_id: testCustomerId,
          quote_number: 'EST006',
          status: 'Sent',
          line_items: [],
          total_amount: 1000,
          valid_until: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        })
        .select()
        .single();

      // Query for expired quotes
      const { data: expiredQuotes } = await supabase
        .from('quotes')
        .select()
        .eq('business_id', TestScenarios.defaultBusiness.id)
        .eq('status', 'Sent')
        .lt('valid_until', new Date().toISOString());

      expect(expiredQuotes).toHaveLength(1);
      expect(expiredQuotes?.[0].id).toBe(expiredQuote?.id);
    });
  });
});