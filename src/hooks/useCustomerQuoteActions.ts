import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buildEdgeFunctionUrl } from '@/utils/env';
import { toast } from 'sonner';

interface QuoteLineItem {
  id: string;
  name: string;
  qty: number;
  unit: string | null;
  unit_price: number;
  line_total: number;
  position: number;
}

export interface CustomerQuoteDetail {
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
  sent_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  signature_data_url: string | null;
  public_token: string;
  customer_notes: string | null;
  quote_line_items: QuoteLineItem[];
}

interface QuoteDetailResponse {
  quote: CustomerQuoteDetail;
  business: {
    id: string;
    name: string;
    logo_url: string | null;
    light_logo_url: string | null;
    phone: string | null;
    reply_to_email: string | null;
  };
  customerName: string;
}

export function useCustomerQuoteDetail(quoteId: string | null) {
  return useQuery({
    queryKey: ['customer-quote-detail', quoteId],
    queryFn: async (): Promise<QuoteDetailResponse> => {
      const sessionToken = localStorage.getItem('customer_session_token');
      if (!sessionToken) throw new Error('Not authenticated');

      const response = await fetch(
        buildEdgeFunctionUrl('customer-quote-actions', { quoteId: quoteId! }),
        {
          headers: {
            'x-session-token': sessionToken,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch quote');
      }

      return response.json();
    },
    enabled: !!quoteId,
  });
}

export function useAcceptQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, signature }: { quoteId: string; signature: string }) => {
      const sessionToken = localStorage.getItem('customer_session_token');
      if (!sessionToken) throw new Error('Not authenticated');

      const response = await fetch(
        buildEdgeFunctionUrl('customer-quote-actions'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': sessionToken,
          },
          body: JSON.stringify({
            action: 'accept',
            quoteId,
            signature,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept quote');
      }

      return response.json();
    },
    onSuccess: (_, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: ['customer-quote-detail', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['customer-job-data'] });
      toast.success('Quote accepted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeclineQuote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (quoteId: string) => {
      const sessionToken = localStorage.getItem('customer_session_token');
      if (!sessionToken) throw new Error('Not authenticated');

      const response = await fetch(
        buildEdgeFunctionUrl('customer-quote-actions'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': sessionToken,
          },
          body: JSON.stringify({
            action: 'decline',
            quoteId,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to decline quote');
      }

      return response.json();
    },
    onSuccess: (_, quoteId) => {
      queryClient.invalidateQueries({ queryKey: ['customer-quote-detail', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['customer-job-data'] });
      toast.success('Quote declined');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRequestQuoteChanges() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ quoteId, notes }: { quoteId: string; notes: string }) => {
      const sessionToken = localStorage.getItem('customer_session_token');
      if (!sessionToken) throw new Error('Not authenticated');

      const response = await fetch(
        buildEdgeFunctionUrl('customer-quote-actions'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-session-token': sessionToken,
          },
          body: JSON.stringify({
            action: 'request_changes',
            quoteId,
            notes,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit change request');
      }

      return response.json();
    },
    onSuccess: (_, { quoteId }) => {
      queryClient.invalidateQueries({ queryKey: ['customer-quote-detail', quoteId] });
      queryClient.invalidateQueries({ queryKey: ['customer-job-data'] });
      toast.success('Change request submitted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
