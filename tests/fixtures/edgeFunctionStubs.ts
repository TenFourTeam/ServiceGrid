/**
 * Realistic Edge Function response stubs for integration testing
 * These match the actual response structures from the backend
 */

export interface EdgeFunctionStub {
  method: string;
  response: any;
  status?: number;
}

export const edgeFunctionStubs: Record<string, EdgeFunctionStub[]> = {
  'audit-logs-crud': [
    {
      method: 'GET',
      response: {
        auditLogs: [
          {
            id: 'log_1',
            business_id: 'biz_owner_a',
            user_id: 'user_owner_a',
            action: 'customer_created',
            resource_type: 'customer',
            resource_id: 'cust_1',
            details: { name: 'John Doe', email: 'john@example.com' },
            ip_address: '192.168.1.1',
            user_agent: 'Mozilla/5.0',
            created_at: '2024-01-15T10:30:00Z'
          }
        ]
      }
    }
  ],

  'business-role': [
    {
      method: 'GET',
      response: {
        role: 'owner',
        business: {
          id: 'biz_owner_a',
          name: 'Owner Business A',
          description: 'Test business for owner',
          logo_url: null,
          phone: '+1234567890'
        }
      }
    }
  ],

  'customers-crud': [
    {
      method: 'GET',
      response: {
        customers: [
          {
            id: 'cust_1',
            business_id: 'biz_owner_a',
            owner_id: 'user_owner_a',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            address: '123 Main St, City, State',
            notes: 'Test customer',
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-15T10:30:00Z'
          },
          {
            id: 'cust_2',
            business_id: 'biz_owner_a',
            owner_id: 'user_owner_a',
            name: 'Jane Smith',
            email: 'jane@example.com',
            phone: '+1987654321',
            address: '456 Oak Ave, City, State',
            notes: 'VIP customer',
            created_at: '2024-01-16T14:20:00Z',
            updated_at: '2024-01-16T14:20:00Z'
          }
        ],
        count: 2
      }
    },
    {
      method: 'POST',
      response: {
        customer: {
          id: 'cust_new',
          business_id: 'biz_owner_a',
          owner_id: 'user_owner_a',
          name: 'New Customer',
          email: 'new@example.com',
          phone: '+1555555555',
          address: '789 Pine St, City, State',
          notes: 'Just created',
          created_at: '2024-01-17T09:15:00Z',
          updated_at: '2024-01-17T09:15:00Z'
        }
      },
      status: 201
    }
  ],

  'quotes-crud': [
    {
      method: 'GET',
      response: {
        quotes: [
          {
            id: 'quote_1',
            business_id: 'biz_owner_a',
            customer_id: 'cust_1',
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            title: 'Kitchen Renovation',
            description: 'Complete kitchen remodel',
            status: 'pending',
            total_amount: 15000.00,
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-15T10:30:00Z',
            line_items: [
              {
                description: 'Labor',
                quantity: 40,
                rate: 75.00,
                amount: 3000.00
              },
              {
                description: 'Materials',
                quantity: 1,
                rate: 12000.00,
                amount: 12000.00
              }
            ]
          }
        ],
        count: 1
      }
    }
  ],

  'invoices-crud': [
    {
      method: 'GET',
      response: {
        invoices: [
          {
            id: 'inv_1',
            business_id: 'biz_owner_a',
            customer_id: 'cust_1',
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            invoice_number: 'INV-2024-001',
            status: 'paid',
            total_amount: 15000.00,
            due_date: '2024-02-15T00:00:00Z',
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-20T16:45:00Z'
          }
        ],
        count: 1
      }
    }
  ],

  'user-businesses': [
    {
      method: 'GET',
      response: [
        {
          id: 'biz_owner_a',
          name: 'Owner Business A',
          role: 'owner',
          logo_url: null,
          joined_at: '2024-01-01T00:00:00Z',
          is_current: true
        },
        {
          id: 'biz_worker_b',
          name: 'Worker Business B',
          role: 'worker',
          logo_url: null,
          joined_at: '2024-01-05T00:00:00Z',
          is_current: false
        }
      ]
    }
  ],

  'requests-crud': [
    {
      method: 'GET',
      response: {
        data: [
          {
            id: 'req_1',
            business_id: 'biz_owner_a',
            customer_name: 'John Doe',
            customer_email: 'john@example.com',
            customer_phone: '+1234567890',
            service_type: 'plumbing',
            description: 'Leaky faucet repair',
            status: 'pending',
            priority: 'medium',
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-15T10:30:00Z'
          }
        ],
        count: 1
      }
    }
  ],

  'jobs-crud': [
    {
      method: 'GET',
      response: {
        jobs: [
          {
            id: 'job_1',
            business_id: 'biz_owner_a',
            customer_id: 'cust_1',
            customer_name: 'John Doe',
            title: 'Kitchen Installation',
            description: 'Install new kitchen cabinets',
            status: 'scheduled',
            scheduled_date: '2024-01-20T09:00:00Z',
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-01-15T10:30:00Z'
          }
        ],
        count: 1
      }
    }
  ]
};

/**
 * Get stub response for an Edge Function
 */
export function getStubResponse(functionName: string, method: string = 'GET', scenario: string = 'default') {
  const stubs = edgeFunctionStubs[functionName];
  if (!stubs) {
    throw new Error(`No stubs found for function: ${functionName}`);
  }

  const stub = stubs.find(s => s.method === method);
  if (!stub) {
    throw new Error(`No stub found for ${functionName} with method ${method}`);
  }

  return {
    response: stub.response,
    status: stub.status || 200
  };
}

/**
 * Scenario-based response variations
 */
export const scenarioStubs = {
  businessOwnerA: {
    businessId: 'biz_owner_a',
    userId: 'user_owner_a',
    role: 'owner'
  },
  businessWorkerA: {
    businessId: 'biz_owner_a', 
    userId: 'user_worker_a',
    role: 'worker'
  },
  businessOwnerB: {
    businessId: 'biz_owner_b',
    userId: 'user_owner_b', 
    role: 'owner'
  }
};