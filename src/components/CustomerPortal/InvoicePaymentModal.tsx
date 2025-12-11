import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CreditCard, Shield, AlertCircle, RefreshCw } from 'lucide-react';
import { useStripePublishableKey } from '@/hooks/useStripePublishableKey';
import { buildEdgeFunctionUrl } from '@/utils/env';
import { PaymentSuccessView } from './PaymentSuccessView';
import type { CustomerInvoice, CustomerBusiness } from '@/types/customerPortal';

interface InvoicePaymentModalProps {
  invoice: CustomerInvoice;
  business?: CustomerBusiness | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentComplete?: () => void;
}

type ModalState = 'loading' | 'checkout' | 'success' | 'error';

export function InvoicePaymentModal({ 
  invoice, 
  business,
  open, 
  onOpenChange,
  onPaymentComplete 
}: InvoicePaymentModalProps) {
  const { data: publishableKey, isLoading: isLoadingKey } = useStripePublishableKey();
  const [modalState, setModalState] = useState<ModalState>('loading');
  const [error, setError] = useState<string | null>(null);

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setModalState('loading');
      setError(null);
    }
  }, [open]);

  const fetchClientSecret = useCallback(async () => {
    try {
      console.log('[InvoicePaymentModal] Fetching client secret for invoice:', invoice.id);
      setModalState('loading');
      setError(null);
      
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

      console.log('[InvoicePaymentModal] Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[InvoicePaymentModal] Error response:', errorData);
        throw new Error(errorData.error || 'Failed to create checkout session');
      }

      const { clientSecret } = await response.json();
      console.log('[InvoicePaymentModal] Got client secret:', !!clientSecret);
      
      if (!clientSecret) {
        throw new Error('No client secret returned from server');
      }
      
      setModalState('checkout');
      return clientSecret;
    } catch (err) {
      console.error('[InvoicePaymentModal] Fetch error:', err);
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setModalState('error');
      throw err;
    }
  }, [invoice.id, invoice.public_token]);

  const handleComplete = useCallback(() => {
    setModalState('success');
    onPaymentComplete?.();
  }, [onPaymentComplete]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleRetry = () => {
    setModalState('loading');
    setError(null);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const handleViewInvoice = () => {
    // Close the payment modal - user can view invoice from documents tab
    handleClose();
  };

  const renderContent = () => {
    // Success state
    if (modalState === 'success') {
      return (
        <PaymentSuccessView
          invoiceNumber={invoice.number}
          amount={invoice.total}
          onClose={handleClose}
          onViewInvoice={handleViewInvoice}
        />
      );
    }

    // Error state
    if (modalState === 'error') {
      return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Payment Error</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {error || 'Unable to load payment form. Please try again.'}
            </p>
          </div>
          <Button onClick={handleRetry} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      );
    }

    // Loading key state
    if (isLoadingKey) {
      return <PaymentSkeleton />;
    }

    // No Stripe key available
    if (!stripePromise) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-3 text-muted-foreground/60" />
          <p>Payment system unavailable. Please try again later.</p>
        </div>
      );
    }

    // Checkout state
    return (
      <EmbeddedCheckoutProvider
        stripe={stripePromise}
        options={{ 
          fetchClientSecret,
          onComplete: handleComplete,
        }}
      >
        <EmbeddedCheckout className="min-h-[400px]" />
      </EmbeddedCheckoutProvider>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header with branding */}
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-start gap-4">
            {business?.logo_url && (
              <img 
                src={business.logo_url} 
                alt={business.name} 
                className="h-10 w-10 rounded-lg object-contain bg-muted"
              />
            )}
            <div className="flex-1">
              <DialogTitle className="text-lg">Pay Invoice #{invoice.number}</DialogTitle>
              {business?.name && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {business.name}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold">{formatCurrency(invoice.total)}</p>
              <p className="text-xs text-muted-foreground">Amount due</p>
            </div>
          </div>
        </DialogHeader>

        {/* Save card messaging - only show during checkout */}
        {modalState === 'checkout' && (
          <div className="px-6 py-3 bg-muted/30 border-b flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>Your card will be saved for faster future payments</span>
            </div>
            <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5" />
              <span>Secure</span>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="px-6 pb-6 pt-4">
          {renderContent()}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentSkeleton() {
  return (
    <div className="space-y-4 py-4">
      {/* Card input skeleton */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-12 w-full" />
      </div>
      
      {/* Expiry and CVC row */}
      <div className="flex gap-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>

      {/* Billing address skeleton */}
      <div className="space-y-3 pt-4">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>

      {/* Pay button skeleton */}
      <Skeleton className="h-12 w-full mt-6" />
    </div>
  );
}
