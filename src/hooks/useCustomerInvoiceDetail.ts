import { useQuery } from '@tanstack/react-query';
import { buildEdgeFunctionUrl } from '@/utils/env';

interface InvoiceLineItem {
  id: string;
  name: string;
  qty: number;
  unit: string | null;
  unit_price: number;
  line_total: number;
  position: number;
}

interface InvoicePayment {
  id: string;
  amount: number;
  method: string;
  last4: string | null;
  received_at: string;
  status: string;
}

export interface CustomerInvoiceDetail {
  id: string;
  number: string;
  status: string;
  total: number;
  subtotal: number;
  tax_rate: number;
  discount: number;
  address: string | null;
  terms: string | null;
  deposit_required: boolean;
  deposit_percent: number | null;
  payment_terms: string | null;
  frequency: string | null;
  created_at: string;
  due_at: string | null;
  paid_at: string | null;
  public_token: string;
  invoice_line_items: InvoiceLineItem[];
  job?: { id: string; title: string | null } | null;
  quote?: { id: string; number: string } | null;
}

interface InvoiceDetailResponse {
  invoice: CustomerInvoiceDetail;
  business: {
    id: string;
    name: string;
    logo_url: string | null;
    light_logo_url: string | null;
    phone: string | null;
    reply_to_email: string | null;
  };
  customerName: string;
  payments: InvoicePayment[];
}

export function useCustomerInvoiceDetail(invoiceId: string | null) {
  return useQuery({
    queryKey: ['customer-invoice-detail', invoiceId],
    queryFn: async (): Promise<InvoiceDetailResponse> => {
      const sessionToken = localStorage.getItem('customer_session_token');
      if (!sessionToken) throw new Error('Not authenticated');

      const response = await fetch(
        buildEdgeFunctionUrl('customer-invoice-detail', { invoiceId: invoiceId! }),
        {
          headers: {
            'x-session-token': sessionToken,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch invoice');
      }

      return response.json();
    },
    enabled: !!invoiceId,
  });
}
