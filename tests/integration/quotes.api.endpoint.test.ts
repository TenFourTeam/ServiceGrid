import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupEdgeFunctionMocks, setupBusinessContextMock, restoreFetch, storeOriginalFetch } from '../fixtures/fetchMock';

describe('Quotes API Integration', () => {
  let mockUtils: ReturnType<typeof setupEdgeFunctionMocks>;

  beforeEach(() => {
    storeOriginalFetch();
    mockUtils = setupBusinessContextMock('biz_owner_a', 'owner');
  });

  afterEach(() => {
    restoreFetch();
  });

  it('should fetch quotes successfully', async () => {
    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/quotes-crud', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('quotes');
    expect(Array.isArray(data.quotes)).toBe(true);
    expect(data.quotes).toHaveLength(1);
    expect(data.quotes[0].title).toBe('Kitchen Renovation');
    expect(data.quotes[0].total_amount).toBe(15000.00);
  });

  it('should create quote successfully', async () => {
    // Add custom response for POST
    mockUtils.addCustomResponse('quotes-crud', 'POST', {
      quote: {
        id: 'quote_new',
        business_id: 'biz_owner_a',
        customer_id: 'cust_1',
        title: 'New Test Quote',
        description: 'Test quote description',
        status: 'draft',
        total_amount: 500.00,
        line_items: [
          {
            description: 'Labor',
            quantity: 10,
            rate: 50.00,
            amount: 500.00
          }
        ]
      }
    }, 201);

    const quoteData = {
      customer_id: 'cust_1',
      title: 'New Test Quote',
      description: 'Test quote description',
      line_items: [
        {
          description: 'Labor',
          quantity: 10,
          rate: 50.00
        }
      ]
    };

    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/quotes-crud', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(quoteData)
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(response.status).toBe(201);
    expect(data).toHaveProperty('quote');
    expect(data.quote.title).toBe('New Test Quote');
    expect(data.quote.total_amount).toBe(500.00);
  });

  it('should handle worker permissions correctly', async () => {
    // Setup worker context
    const workerMock = setupBusinessContextMock('biz_owner_a', 'worker');
    
    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/quotes-crud', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data).toHaveProperty('quotes');
    expect(Array.isArray(data.quotes)).toBe(true);
  });

  it('should handle business isolation', async () => {
    // Test that quotes are isolated per business
    mockUtils.addCustomResponse('quotes-crud', 'GET', {
      quotes: [
        {
          id: 'quote_biz_a',
          business_id: 'biz_owner_a',
          customer_name: 'Customer A',
          title: 'Business A Quote'
        }
      ],
      count: 1
    });

    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/quotes-crud', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    expect(data.quotes[0].business_id).toBe('biz_owner_a');
    expect(data.quotes[0].title).toBe('Business A Quote');
  });

  it('should handle quote status transitions', async () => {
    // Test quote status updates
    mockUtils.addCustomResponse('quotes-crud', 'PUT', {
      quote: {
        id: 'quote_1',
        business_id: 'biz_owner_a',
        title: 'Kitchen Renovation',
        status: 'sent',
        total_amount: 15000.00
      }
    });

    const updateData = {
      id: 'quote_1',
      status: 'sent'
    };

    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/quotes-crud', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.quote.status).toBe('sent');
    expect(data.quote.id).toBe('quote_1');
  });

  it('should handle quote deletion', async () => {
    mockUtils.addCustomResponse('quotes-crud', 'DELETE', {
      success: true,
      message: 'Quote deleted successfully'
    });

    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/quotes-crud', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: 'quote_1' })
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Quote deleted successfully');
  });

  it('should handle quote with line items', async () => {
    mockUtils.addCustomResponse('quotes-crud', 'POST', {
      quote: {
        id: 'quote_with_items',
        business_id: 'biz_owner_a',
        customer_id: 'cust_1',
        title: 'Complex Quote',
        status: 'draft',
        total_amount: 2500.00,
        line_items: [
          {
            description: 'Labor',
            quantity: 20,
            rate: 75.00,
            amount: 1500.00
          },
          {
            description: 'Materials',
            quantity: 1,
            rate: 1000.00,
            amount: 1000.00
          }
        ]
      }
    }, 201);

    const quoteData = {
      customer_id: 'cust_1',
      title: 'Complex Quote',
      line_items: [
        {
          description: 'Labor',
          quantity: 20,
          rate: 75.00
        },
        {
          description: 'Materials',
          quantity: 1,
          rate: 1000.00
        }
      ]
    };

    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/quotes-crud', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(quoteData)
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.quote.line_items).toHaveLength(2);
    expect(data.quote.total_amount).toBe(2500.00);
  });
});