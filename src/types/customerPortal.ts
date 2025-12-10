// Customer Portal Types - Job Data & Dashboard

export interface CustomerJobData {
  business: CustomerBusiness;
  customer: CustomerInfo;
  jobs: CustomerJob[];
  upcomingJobs: CustomerJob[];
  quotes: CustomerQuote[];
  invoices: CustomerInvoice[];
  payments: CustomerPayment[];
  financialSummary: FinancialSummary;
  actionItems: ActionItems;
  teamMembers: TeamMember[];
}

export interface CustomerBusiness {
  id: string;
  name: string;
  logo_url: string | null;
  light_logo_url: string | null;
  phone: string | null;
  reply_to_email: string | null;
}

export interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  business_id: string;
}

export interface CustomerJob {
  id: string;
  title: string | null;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  address: string | null;
  notes: string | null;
  created_at?: string;
  job_assignments?: {
    user_id: string;
    profiles: {
      full_name: string | null;
    } | null;
  }[];
}

export interface CustomerQuote {
  id: string;
  number: string;
  status: string;
  total: number;
  created_at: string;
  sent_at: string | null;
  approved_at: string | null;
  public_token: string;
  deposit_required: boolean;
  deposit_percent: number | null;
}

export interface CustomerInvoice {
  id: string;
  number: string;
  status: string;
  total: number;
  created_at: string;
  due_at: string | null;
  paid_at: string | null;
  public_token: string;
  deposit_required: boolean;
  deposit_percent: number | null;
}

export interface CustomerPayment {
  id: string;
  invoice_id: string;
  invoice_number: string;
  amount: number;
  method: string;
  last4: string | null;
  received_at: string;
  status: string;
}

export interface FinancialSummary {
  totalOwed: number;
  totalPaid: number;
  unpaidCount: number;
  overdueCount: number;
}

export interface ActionItems {
  pendingQuotes: number;
  unpaidInvoices: number;
  upcomingAppointments: number;
}

export interface TeamMember {
  id: string;
  full_name: string | null;
  email: string;
}
