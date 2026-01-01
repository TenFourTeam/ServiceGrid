/**
 * Simple mock responses for Edge Function calls
 * Each function returns realistic data structures that match production APIs
 */

export const mockResponses = {
  // Customers CRUD
  'customers-crud': {
    GET: {
      data: {
        customers: [
          {
            id: 'customer-1',
            business_id: 'business-1',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            address: '123 Main St',
            city: 'Anytown',
            state: 'CA',
            zip: '12345',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: 'customer-2',
            business_id: 'business-1',
            name: 'Jane Smith',
            email: 'jane@example.com',
            phone: '+1234567891',
            address: '456 Oak Ave',
            city: 'Anytown',
            state: 'CA',
            zip: '12345',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ],
        count: 2
      },
      error: null
    },
    POST: {
      data: {
        customer: {
          id: 'customer-new',
          business_id: 'business-1',
          name: 'New Customer',
          email: 'new@example.com',
          phone: '+1234567892',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      },
      error: null
    }
  },

  // Quotes CRUD
  'quotes-crud': {
    GET: {
      data: {
        quotes: [
          {
            id: 'quote-1',
            business_id: 'business-1',
            customer_id: 'customer-1',
            title: 'Website Design',
            description: 'Complete website redesign',
            total: 5000,
            status: 'draft',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ],
        count: 1
      },
      error: null
    }
  },

  // Invoices CRUD
  'invoices-crud': {
    GET: {
      data: {
        invoices: [
          {
            id: 'invoice-1',
            business_id: 'business-1',
            customer_id: 'customer-1',
            number: 'INV-001',
            total: 1000,
            status: 'sent',
            created_at: '2024-01-01T00:00:00Z'
          }
        ],
        count: 1
      },
      error: null
    }
  },

  // Profile data
  'get-profile': {
    GET: {
      data: {
        profile: {
          id: 'profile-1',
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          business: {
            id: 'business-1',
            name: 'Test Business',
            role: 'owner',
            description: 'A test business',
            phone: '+1234567890',
            replyToEmail: 'reply@testbusiness.com'
          }
        }
      },
      error: null
    }
  },

  // User businesses
  'user-businesses': {
    GET: {
      data: {
        businesses: [
          {
            id: 'business-1',
            name: 'Test Business',
            role: 'owner'
          }
        ]
      },
      error: null
    }
  }
};

export const mockErrors = {
  unauthorized: {
    data: null,
    error: { message: 'Unauthorized', status: 401 }
  },
  notFound: {
    data: null,
    error: { message: 'Not found', status: 404 }
  },
  validationError: {
    data: null,
    error: { message: 'Validation failed', status: 400 }
  }
};