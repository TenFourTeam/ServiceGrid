/**
 * Mock Data Generators for QuickBooks Integration Testing
 */

import type { 
  QBCustomer, 
  QBInvoice, 
  QBPayment, 
  QBSyncLog,
  ConflictResolution,
  WebhookEvent,
  HealthMetrics,
  SyncPreview,
  EntityMapping,
} from '@/types/quickbooks';

export function mockQBCustomer(overrides?: Partial<QBCustomer>): QBCustomer {
  return {
    Id: Math.random().toString(36).substring(7),
    DisplayName: 'Acme Corporation',
    PrimaryEmailAddr: { Address: 'contact@acme.com' },
    PrimaryPhone: { FreeFormNumber: '(555) 123-4567' },
    BillAddr: {
      Line1: '123 Main Street',
      City: 'Austin',
      CountrySubDivisionCode: 'TX',
      PostalCode: '78701',
    },
    SyncToken: '0',
    ...overrides,
  };
}

export function mockQBInvoice(overrides?: Partial<QBInvoice>): QBInvoice {
  return {
    Id: Math.random().toString(36).substring(7),
    DocNumber: `INV-${Math.floor(Math.random() * 10000)}`,
    CustomerRef: { value: '123', name: 'Acme Corporation' },
    TxnDate: new Date().toISOString().split('T')[0],
    DueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    Line: [
      {
        DetailType: 'SalesItemLineDetail',
        Description: 'Lawn Service',
        Amount: 150.00,
        SalesItemLineDetail: {
          Qty: 1,
          UnitPrice: 150.00,
        },
      },
    ],
    TotalAmt: 150.00,
    Balance: 150.00,
    SyncToken: '0',
    ...overrides,
  };
}

export function mockQBPayment(overrides?: Partial<QBPayment>): QBPayment {
  return {
    Id: Math.random().toString(36).substring(7),
    TotalAmt: 150.00,
    CustomerRef: { value: '123' },
    TxnDate: new Date().toISOString().split('T')[0],
    Line: [
      {
        Amount: 150.00,
        LinkedTxn: [
          {
            TxnId: 'inv-123',
            TxnType: 'Invoice',
          },
        ],
      },
    ],
    ...overrides,
  };
}

export function mockSyncLog(
  status: 'success' | 'error' | 'partial' = 'success',
  overrides?: Partial<QBSyncLog>
): QBSyncLog {
  const recordsProcessed = status === 'error' ? 0 : Math.floor(Math.random() * 50) + 10;
  const recordsFailed = status === 'success' ? 0 : Math.floor(Math.random() * 10);
  
  return {
    id: crypto.randomUUID(),
    business_id: crypto.randomUUID(),
    sync_type: 'customer',
    direction: 'to_qb',
    status,
    records_processed: recordsProcessed,
    records_failed: recordsFailed,
    error_message: status === 'error' ? 'Connection timeout' : undefined,
    metadata: {
      duration_ms: Math.floor(Math.random() * 5000) + 1000,
      api_calls: recordsProcessed + recordsFailed,
    },
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

export function mockSyncConflict(entityType: string = 'customer'): ConflictResolution {
  return {
    id: crypto.randomUUID(),
    business_id: crypto.randomUUID(),
    entity_type: entityType,
    entity_id: crypto.randomUUID(),
    sg_data: {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '(555) 123-4567',
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    qb_data: {
      DisplayName: 'John R. Smith',
      PrimaryEmailAddr: { Address: 'jsmith@example.com' },
      PrimaryPhone: { FreeFormNumber: '(555) 987-6543' },
      MetaData: { LastUpdatedTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() },
    },
    created_at: new Date().toISOString(),
  };
}

export function mockWebhookEvent(eventType: string = 'Create'): WebhookEvent {
  return {
    id: crypto.randomUUID(),
    business_id: crypto.randomUUID(),
    event_type: eventType,
    entity_type: 'Customer',
    qb_entity_id: Math.random().toString(36).substring(7),
    payload: {
      realmId: '123456789',
      name: 'Customer.Create',
      id: Math.random().toString(36).substring(7),
      operation: eventType,
      lastUpdated: new Date().toISOString(),
    },
    processed: false,
    created_at: new Date().toISOString(),
  };
}

export function mockHealthMetrics(status: 'healthy' | 'warning' | 'error' = 'healthy'): HealthMetrics {
  return {
    connection_status: status,
    last_heartbeat: new Date().toISOString(),
    token_expires_in_hours: status === 'warning' ? 2 : 720,
    sync_success_rate_24h: status === 'error' ? 0.45 : 0.98,
    sync_success_rate_7d: 0.95,
    average_sync_duration_seconds: 12.5,
    pending_conflicts: status === 'warning' ? 3 : 0,
    last_error: status === 'error' ? 'Token expired' : undefined,
  };
}

export function mockSyncPreview(): SyncPreview {
  return {
    entity_type: 'customer',
    direction: 'to_qb',
    estimated_records: 45,
    estimated_api_calls: 47,
    changes: {
      create: 20,
      update: 23,
      skip: 2,
    },
    validation_errors: [
      {
        entity_id: crypto.randomUUID(),
        errors: ['Email address is invalid'],
      },
    ],
  };
}

export function mockEntityMapping(): EntityMapping {
  return {
    sg_entity_id: crypto.randomUUID(),
    qb_entity_id: Math.random().toString(36).substring(7),
    entity_type: 'customer',
    last_synced_at: new Date().toISOString(),
    sync_status: 'synced',
  };
}

export function generateMockSyncLogs(count: number): QBSyncLog[] {
  const statuses: Array<'success' | 'error' | 'partial'> = ['success', 'success', 'success', 'partial', 'error'];
  const types: Array<'customer' | 'invoice' | 'payment' | 'time_entry'> = ['customer', 'invoice', 'payment', 'time_entry'];
  
  return Array.from({ length: count }, (_, i) => {
    const createdDate = new Date(Date.now() - i * 60 * 60 * 1000);
    return mockSyncLog(
      statuses[Math.floor(Math.random() * statuses.length)],
      {
        sync_type: types[Math.floor(Math.random() * types.length)],
        created_at: createdDate.toISOString(),
      }
    );
  });
}

export function generateMockConflicts(count: number): ConflictResolution[] {
  const types = ['customer', 'invoice'];
  return Array.from({ length: count }, () => 
    mockSyncConflict(types[Math.floor(Math.random() * types.length)])
  );
}
