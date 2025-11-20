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
