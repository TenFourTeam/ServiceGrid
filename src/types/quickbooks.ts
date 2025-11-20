/**
 * QuickBooks API and utility types for consistent type safety
 */

export interface QBCustomer {
  Id: string;
  DisplayName: string;
  PrimaryEmailAddr?: { Address: string };
  PrimaryPhone?: { FreeFormNumber: string };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
  SyncToken: string;
}

export interface QBInvoice {
  Id: string;
  DocNumber: string;
  CustomerRef: { value: string; name: string };
  TxnDate: string;
  DueDate?: string;
  Line: Array<{
    DetailType: 'SalesItemLineDetail';
    Description?: string;
    Amount: number;
    SalesItemLineDetail: {
      Qty: number;
      UnitPrice: number;
    };
  }>;
  TotalAmt: number;
  Balance: number;
  SyncToken: string;
}

export interface QBPayment {
  Id: string;
  TotalAmt: number;
  CustomerRef: { value: string };
  TxnDate: string;
  Line: Array<{
    Amount: number;
    LinkedTxn: Array<{
      TxnId: string;
      TxnType: 'Invoice';
    }>;
  }>;
}

export type QBSyncType = 'customer' | 'invoice' | 'payment' | 'time_entry';
export type QBSyncDirection = 'to_qb' | 'from_qb' | 'bidirectional';
export type QBSyncStatus = 'success' | 'error' | 'partial';

export interface QBConnectionStatus {
  isConnected: boolean;
  realmId: string | null;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
}

export interface QBSyncLog {
  id: string;
  business_id: string;
  sync_type: QBSyncType;
  direction: QBSyncDirection;
  status: QBSyncStatus;
  records_processed: number;
  records_failed: number;
  error_message?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Extended Types for Full Integration

export interface QBTimeActivity {
  Id: string;
  NameOf: 'Employee' | 'Vendor';
  EmployeeRef?: { value: string };
  VendorRef?: { value: string };
  TxnDate: string;
  Hours?: number;
  Minutes?: number;
  Description?: string;
  CustomerRef?: { value: string; name?: string };
  ItemRef?: { value: string };
}

export interface QBSalesReceipt {
  Id: string;
  DocNumber: string;
  CustomerRef: { value: string; name: string };
  TxnDate: string;
  Line: Array<{
    DetailType: 'SalesItemLineDetail';
    Description?: string;
    Amount: number;
    SalesItemLineDetail: {
      Qty: number;
      UnitPrice: number;
    };
  }>;
  TotalAmt: number;
  PaymentMethodRef?: { value: string };
}

export interface QBEstimate {
  Id: string;
  DocNumber: string;
  CustomerRef: { value: string; name: string };
  TxnDate: string;
  ExpirationDate?: string;
  Line: Array<{
    DetailType: 'SalesItemLineDetail';
    Description?: string;
    Amount: number;
    SalesItemLineDetail: {
      Qty: number;
      UnitPrice: number;
    };
  }>;
  TotalAmt: number;
  TxnStatus: 'Pending' | 'Accepted' | 'Rejected' | 'Closed';
}

export interface QBItem {
  Id: string;
  Name: string;
  Type: 'Service' | 'Inventory' | 'NonInventory';
  Description?: string;
  UnitPrice?: number;
  IncomeAccountRef?: { value: string };
  Active: boolean;
}

export interface SyncSchedule {
  id: string;
  business_id: string;
  entity_type: QBSyncType;
  enabled: boolean;
  frequency_minutes: number;
  direction: QBSyncDirection;
  last_run_at?: string;
  next_run_at?: string;
  filters?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface FieldMapping {
  id: string;
  business_id: string;
  entity_type: string;
  sg_field: string;
  qb_field: string;
  transform_function?: string;
  is_required: boolean;
  created_at: string;
}

export interface ConflictResolution {
  id: string;
  business_id: string;
  entity_type: string;
  entity_id: string;
  sg_data: Record<string, unknown>;
  qb_data: Record<string, unknown>;
  resolution?: 'sg' | 'qb' | 'merged';
  resolved_data?: Record<string, unknown>;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}

export interface WebhookEvent {
  id: string;
  business_id: string;
  event_type: string;
  entity_type: string;
  qb_entity_id: string;
  payload: Record<string, unknown>;
  processed: boolean;
  processed_at?: string;
  created_at: string;
}

export interface SyncPreview {
  entity_type: QBSyncType;
  direction: QBSyncDirection;
  estimated_records: number;
  estimated_api_calls: number;
  changes: {
    create: number;
    update: number;
    skip: number;
  };
  validation_errors: Array<{
    entity_id: string;
    errors: string[];
  }>;
}

export interface HealthMetrics {
  connection_status: 'healthy' | 'warning' | 'error';
  last_heartbeat: string;
  token_expires_in_hours: number;
  sync_success_rate_24h: number;
  sync_success_rate_7d: number;
  average_sync_duration_seconds: number;
  pending_conflicts: number;
  last_error?: string;
}

export interface EntityMapping {
  sg_entity_id: string;
  qb_entity_id: string;
  entity_type: string;
  last_synced_at: string;
  sync_status: 'synced' | 'pending' | 'error';
}
