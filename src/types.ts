
export type ID = string;
export type Money = number; // cents
export type ISODate = string;

// New types for quotes
export type QuoteFrequency = 'one-off' | 'bi-monthly' | 'monthly' | 'bi-yearly' | 'yearly';
export type PaymentTerms = 'due_on_receipt' | 'net_15' | 'net_30' | 'net_60';

export interface Business {
  id: ID;
  name: string;
  logoUrl?: string;
  lightLogoUrl?: string; // NEW: light icon for emails
  phone?: string;
  replyToEmail?: string;
  taxRateDefault: number; // 0.0 - 1.0
  numbering: {
    estPrefix: string;
    estSeq: number;
    invPrefix: string;
    invSeq: number;
  };
}

export interface Customer {
  id: ID;
  businessId: ID;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface LineItem {
  id: ID;
  name: string;
  qty: number;
  unit?: string;
  unitPrice: Money;
  lineTotal: Money; // computed
}

export type QuoteStatus = 'Draft' | 'Sent' | 'Viewed' | 'Approved' | 'Declined' | 'Edits Requested';
export interface Quote {
  id: ID;
  number: string; // EST-###
  businessId: ID;
  customerId: ID;
  address?: string;
  lineItems: LineItem[];
  taxRate: number;
  discount: Money; // absolute (cents)

  // New fields for "Quoted" journey
  paymentTerms?: PaymentTerms;
  frequency?: QuoteFrequency;
  depositRequired?: boolean;
  depositPercent?: number; // 0..100
  sentAt?: ISODate;
  viewCount?: number;

  subtotal: Money;
  total: Money;
  status: QuoteStatus;
  files?: string[]; // local object URLs
  notesInternal?: string;
  terms?: string;
  approvedAt?: ISODate;
  approvedBy?: string; // typed name
  createdAt: ISODate;
  updatedAt: ISODate;
  publicToken: string;
}

// Backward-compatibility aliases
export type EstimateStatus = QuoteStatus;
export interface Estimate extends Quote {}

export type JobStatus = 'Scheduled' | 'In Progress' | 'Completed';
export interface Job {
  id: ID;
  businessId: ID;
  quoteId?: ID;
  customerId: ID;
  address?: string;
  title?: string;
  startsAt: ISODate;
  endsAt: ISODate;
  status: JobStatus;
  recurrence?: 'biweekly';
  notes?: string;
  total?: Money;
  photos?: string[]; // public URLs for job photos
  createdAt: ISODate;
  updatedAt: ISODate;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';
export interface Invoice {
  id: ID;
  number: string; // INV-###
  businessId: ID;
  customerId: ID;
  jobId?: ID;
  lineItems: LineItem[];
  taxRate: number;
  discount: Money;
  subtotal: Money;
  total: Money;
  status: InvoiceStatus;
  dueAt?: ISODate;
  paidAt?: ISODate;
  createdAt: ISODate;
  updatedAt: ISODate;
  publicToken: string;
}

export interface Payment {
  id: ID;
  businessId: ID;
  invoiceId: ID;
  amount: Money;
  status: 'Succeeded' | 'Failed';
  receivedAt: ISODate;
  method: 'Card';
  last4?: string; // fake entry
}

export interface AppEvent {
  id: ID;
  ts: ISODate;
  type:
    | 'quote.created' | 'quote.sent' | 'quote.approved'
    | 'job.created' | 'job.updated' | 'job.completed'
    | 'invoice.created' | 'invoice.sent' | 'invoice.paid';
  entityId: ID;
  meta?: Record<string, any>;
}

export interface AppState {
  business: Business;
  customers: Customer[];
  quotes: Quote[];
  jobs: Job[];
  invoices: Invoice[];
  payments: Payment[];
  events: AppEvent[];
  ui?: {
    setupWidgetDismissed?: boolean;
    setupWidgetDismissedAt?: string | null;
  };
}

