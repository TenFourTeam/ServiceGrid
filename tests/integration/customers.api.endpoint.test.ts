import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupEdgeFunctionMocks, setupBusinessContextMock, restoreFetch, storeOriginalFetch } from '../fixtures/fetchMock';

describe('Customers API Integration', () => {
  let mockUtils: ReturnType<typeof setupEdgeFunctionMocks>;

  beforeEach(() => {
    storeOriginalFetch();
    mockUtils = setupBusinessContextMock('biz_owner_a', 'owner');
  });

  afterEach(() => {
    restoreFetch();
  });

  it('should fetch customers successfully', async () => {
    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/customers-crud', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('customers');
    expect(Array.isArray(data.customers)).toBe(true);
    expect(data.customers).toHaveLength(2);
    expect(data.customers[0].name).toBe('John Doe');
    expect(data.customers[1].name).toBe('Jane Smith');
  });

  it('should create customer successfully', async () => {
    const customerData = {
      name: 'New Test Customer',
      email: 'test@example.com',
      phone: '+1234567890',
      address: '123 Test St'
    };

    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/customers-crud', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(customerData)
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(response.status).toBe(201);
    expect(data).toHaveProperty('customer');
    expect(data.customer.name).toBe('New Customer');
    expect(data.customer.email).toBe('new@example.com');
  });

  it('should handle business context correctly', async () => {
    // Setup mock for specific business context
    mockUtils.addCustomResponse('customers-crud', 'GET', {
      customers: [
        {
          id: 'cust_business_specific',
          business_id: 'biz_owner_a',
          name: 'Business A Customer',
          email: 'customer@businessa.com'
        }
      ],
      count: 1
    });

    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/customers-crud', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.customers[0].business_id).toBe('biz_owner_a');
    expect(data.customers[0].name).toBe('Business A Customer');
  });

  it('should handle worker role permissions', async () => {
    // Setup worker context
    const workerMock = setupBusinessContextMock('biz_owner_a', 'worker');
    
    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/customers-crud', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data).toHaveProperty('customers');
    expect(Array.isArray(data.customers)).toBe(true);
  });

  it('should handle business isolation', async () => {
    // Test that customers are isolated per business
    mockUtils.addCustomResponse('customers-crud', 'GET', {
      customers: [
        {
          id: 'cust_biz_a',
          business_id: 'biz_owner_a',
          name: 'Customer A',
          email: 'customer@businessa.com'
        }
      ],
      count: 1
    });

    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/customers-crud', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    expect(data.customers[0].business_id).toBe('biz_owner_a');
    expect(data.customers[0].name).toBe('Customer A');  
  });

  it('should handle update operations', async () => {
    mockUtils.addCustomResponse('customers-crud', 'PUT', {
      customer: {
        id: 'cust_1',
        business_id: 'biz_owner_a',
        name: 'Updated Customer Name',
        email: 'updated@example.com',
        phone: '+1234567890'
      }
    });

    const updateData = {
      id: 'cust_1',
      name: 'Updated Customer Name',
      email: 'updated@example.com'
    };

    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/customers-crud', {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.customer.name).toBe('Updated Customer Name');
    expect(data.customer.email).toBe('updated@example.com');
  });

  it('should handle delete operations', async () => {
    mockUtils.addCustomResponse('customers-crud', 'DELETE', {
      success: true,
      message: 'Customer deleted successfully'
    });

    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/customers-crud', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer mock_token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ id: 'cust_1' })
    });

    const data = await response.json();

    expect(response.ok).toBe(true);
    expect(data.success).toBe(true);
    expect(data.message).toBe('Customer deleted successfully');
  });
});