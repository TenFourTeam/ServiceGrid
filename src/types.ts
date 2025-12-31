
export type ID = string;
export type Money = number; // cents
export type ISODate = string;

// New types for quotes
export type QuoteFrequency = 'one-off' | 'weekly' | 'bi-monthly' | 'monthly' | 'quarterly' | 'bi-yearly' | 'yearly';
export type PaymentTerms = 'due_on_receipt' | 'net_15' | 'net_30' | 'net_60';

export interface Business {
  id: ID;
  name: string;
  name_customized?: boolean; // Track whether user has customized business name
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
  ownerId: ID;
  name: string;
  email: string; // Required in database
  phone?: string;
  address?: string;
  notes?: string;
  // Scheduling preferences
  preferred_days?: string; // JSON array of day indices
  avoid_days?: string; // JSON array of day indices
  preferred_time_window?: string; // JSON object with start/end times
  scheduling_notes?: string;
  // Lead qualification fields
  lead_score?: number; // 0-100 score based on data completeness
  lead_source?: string; // Where the lead came from
  is_qualified?: boolean; // Whether lead meets threshold
  qualified_at?: ISODate; // When they became qualified
  qualification_notes?: string;
  createdAt?: ISODate;
  updatedAt?: ISODate;
}

export interface LineItem {
  id: ID;
  name: string;
  qty: number;
  unit?: string;
  unitPrice: Money;
  lineTotal: Money; // computed
  itemType?: 'material' | 'labor' | 'equipment' | 'service';
  laborHours?: number;
  crewSize?: number;
}

export type QuoteStatus = 'Draft' | 'Sent' | 'Viewed' | 'Approved' | 'Declined' | 'Edits Requested';

// Minimal quote data for list views
export interface QuoteListItem {
  id: ID;
  number: string;
  total: Money;
  status: QuoteStatus;
  updatedAt: ISODate;
  viewCount: number;
  publicToken: string;
  customerId: ID;
  customerName?: string;
  customerEmail?: string;
  sentAt?: ISODate;
  hasSignature?: boolean;
}

// Full quote data for detailed operations
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

  // Subscription fields
  isSubscription?: boolean;
  stripeSubscriptionId?: string;

  subtotal: Money;
  total: Money;
  status: QuoteStatus;
  files?: string[]; // local object URLs
  notesInternal?: string;
  terms?: string;
  approvedAt?: ISODate;
  approvedBy?: string; // typed name
  customerNotes?: string; // Customer feedback when requesting edits
  signatureDataUrl?: string; // Customer e-signature on approval
  createdAt: ISODate;
  updatedAt: ISODate;
  publicToken: string;
}

// Backward-compatibility aliases
export type EstimateStatus = QuoteStatus;
export interface Estimate extends Quote {
  // Legacy alias for Quote interface
}

export type JobStatus = 'Scheduled' | 'Schedule Approved' | 'In Progress' | 'Completed';
export type JobType = 'estimate' | 'appointment' | 'time_and_materials';

export interface Job {
  id: ID;
  businessId: ID;
  ownerId: ID;
  quoteId?: ID;
  customerId: ID;
  // Customer fields for display (populated by backend)
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  address?: string;
  title?: string;
  startsAt?: ISODate;
  endsAt?: ISODate;
  status: JobStatus;
  recurrence?: 'biweekly';
  notes?: string;
  total?: Money;
  photos?: string[]; // public URLs for job photos
  uploadingPhotos?: boolean; // optimistic state for photo uploads
  jobType?: JobType; // Optional to handle legacy data
  clockInTime?: ISODate | null;
  clockOutTime?: ISODate | null;
  isClockedIn: boolean;
  assignedMembers?: BusinessMember[]; // NEW: assigned team members
  isAssessment?: boolean; // DEPRECATED: Use jobType === 'estimate' instead. Kept for backward compatibility with existing data.
  requestId?: string; // NEW: links back to the originating request
  confirmationToken?: string; // NEW: confirmation token for work order confirmations
  confirmedAt?: ISODate; // NEW: when confirmation was received
  // AI Scheduling fields
  priority?: number; // 1-5, where 1 is most urgent
  estimatedDurationMinutes?: number;
  preferredTimeWindow?: {
    start: string; // "09:00"
    end: string; // "17:00"
  };
  aiSuggested?: boolean;
  schedulingScore?: number; // 0.0 - 1.0
  optimizedOrder?: number; // Position in optimized route
  latitude?: number; // Geocoded latitude for job location
  longitude?: number; // Geocoded longitude for job location
  createdAt: ISODate;
  updatedAt: ISODate;
}

// Business member interface for job assignments
export interface BusinessMember {
  id: ID;
  business_id: ID;
  user_id: ID;
  role: 'owner' | 'worker';
  invited_at: ISODate;
  joined_at?: ISODate;
  invited_by?: ID;
  joined_via_invite: boolean;
  email?: string;
  name?: string;
}

export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue';
export interface Invoice {
  id: ID;
  number: string; // INV-###
  businessId: ID;
  customerId: ID;
  jobId?: ID;
  quoteId?: ID;
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
  // New fields to match Quote functionality
  address?: string;
  paymentTerms?: PaymentTerms;
  frequency?: QuoteFrequency;
  depositRequired: boolean;
  depositPercent?: number;
  notesInternal?: string;
  terms?: string;
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
  meta?: Record<string, unknown>;
}

export interface AppState {
  business: Business;
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

// Additional types for form data and API responses
export interface CustomerFormData {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export interface BusinessFormData {
  name: string;
  description?: string;
  phone?: string;
  replyToEmail?: string;
  taxRateDefault: number;
}

export interface ProfileFormData {
  fullName?: string;
  phoneE164?: string;
  email?: string;
}

// Cache data interfaces for type safety
export interface JobsCacheData {
  jobs: Job[];
  count: number;
}

export interface InvoicesCacheData {
  invoices: Invoice[];
  count: number;
}

export interface CustomersCacheData {
  customers: Customer[];
  count: number;
}

export interface QuotesCacheData {
  quotes: Quote[];
  count: number;
}

