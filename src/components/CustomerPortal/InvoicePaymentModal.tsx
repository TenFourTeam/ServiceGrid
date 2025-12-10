import React, { useCallback, useMemo } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { useStripePublishableKey } from '@/hooks/useStripePublishableKey';
import { buildEdgeFunctionUrl } from '@/utils/env';
import type { CustomerInvoice } from '@/types/customerPortal';

interface InvoicePaymentModalProps {
  invoice: CustomerInvoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InvoicePaymentModal({ invoice, open, onOpenChange }: InvoicePaymentModalProps) {
  const { data: publishableKey, isLoading: isLoadingKey } = useStripePublishableKey();

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  const fetchClientSecret = useCallback(async () => {
    const response = await fetch(
      buildEdgeFunctionUrl('payments-crud', { action: 'create_embedded_checkout' }),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: invoice.id,
          token: invoice.public_token,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create checkout session');
    }

    const { clientSecret } = await response.json();
    return clientSecret;
  }, [invoice.id, invoice.public_token]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Pay Invoice #{invoice.number}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Amount due: {formatCurrency(invoice.total)}
          </p>
        </DialogHeader>

        <div className="px-6 pb-6">
          {isLoadingKey ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : stripePromise ? (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout className="min-h-[400px]" />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              Payment system unavailable. Please try again later.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
