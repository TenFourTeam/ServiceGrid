import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, PhoneIcon, MailIcon, AlertTriangle } from 'lucide-react';
import type { Quote } from '@/types';
import { formatMoney } from '@/utils/format';
import { buildEdgeFunctionUrl } from '@/utils/env';

export default function QuoteViewer() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionConsent, setSubscriptionConsent] = useState(false);

  useEffect(() => {
    // Set page title and meta
    document.title = 'Quote • ServiceGrid';
    const existing = document.querySelector('link[rel="canonical"]');
    const href = window.location.href;
    if (existing) {
      (existing as HTMLLinkElement).href = href;
    } else {
      const link = document.createElement('link');
      link.rel = 'canonical';
      link.href = href;
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    async function fetchQuote() {
      if (!token) {
        setError('No quote token provided');
        setLoading(false);
        return;
      }

      try {
        const url = buildEdgeFunctionUrl('quote-events', {
          type: 'view',
          token
        });
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to load quote (${response.status})`);
        }
        
        const data = await response.json();
        setQuote(data.quote);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch quote:', err);
        setError(err.message || 'Failed to load quote');
        setLoading(false);
      }
    }

    fetchQuote();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="max-w-2xl mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote Not Found</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  {error || 'This quote could not be found or may have expired.'}
                </p>
                <Button onClick={() => window.close()} variant="secondary">
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-4xl mx-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Quote {quote.number}</h1>
              <p className="text-muted-foreground">
                Created {new Date(quote.createdAt).toLocaleDateString()}
              </p>
            </div>
            <Badge variant={quote.status === 'Approved' ? 'default' : 'secondary'}>
              {quote.status}
            </Badge>
          </div>

          {/* Quote Details Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-sm text-muted-foreground">Customer ID: {quote.customerId}</div>
              </CardContent>
            </Card>

            {/* Service Address */}
            {quote.address && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Service Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm whitespace-pre-wrap">{quote.address}</div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Payment & Billing Details */}
          {(quote.paymentTerms || quote.frequency || quote.depositRequired) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment & Billing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  {quote.paymentTerms && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Payment Terms</div>
                      <div className="text-sm">{quote.paymentTerms.replace(/_/g, ' ')}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium text-muted-foreground mb-1">Billing Frequency</div>
                    <div className="text-sm">
                      {quote.frequency ? quote.frequency.replace(/_/g, ' ') : 'One-time'}
                    </div>
                  </div>
                  {quote.depositRequired && quote.depositPercent && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-1">Deposit Required</div>
                      <div className="text-sm">
                        {quote.depositPercent}% ({formatMoney(Math.round((quote.total || 0) * quote.depositPercent / 100))})
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Line Items & Pricing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Services & Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quote.lineItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-start py-3 border-b last:border-b-0">
                    <div className="flex-1">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Qty: {item.qty} × {formatMoney(item.unitPrice)}
                      </div>
                    </div>
                    <div className="font-medium">
                      {formatMoney(item.lineTotal)}
                    </div>
                  </div>
                ))}

                {/* Totals */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatMoney(quote.subtotal)}</span>
                  </div>
                  
                  {quote.taxRate > 0 && (
                    <div className="flex justify-between">
                      <span>Tax ({(quote.taxRate * 100).toFixed(1)}%)</span>
                      <span>{formatMoney(Math.round(quote.subtotal * quote.taxRate))}</span>
                    </div>
                  )}
                  
                  {quote.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-{formatMoney(quote.discount)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between text-lg font-bold pt-2 border-t">
                    <span>Total</span>
                    <span>{formatMoney(quote.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms & Conditions */}
          {quote.terms && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm whitespace-pre-wrap text-muted-foreground">
                  {quote.terms}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Subscription Warning */}
          {quote.status === 'Sent' && quote.isSubscription && (
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/50">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <AlertDescription className="text-orange-800 dark:text-orange-200">
                <div className="space-y-3">
                  <p className="font-medium">⚠️ This is a subscription service quote</p>
                  <div className="text-sm space-y-2">
                    <p>By approving this quote, you agree to:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Recurring billing at the quoted amount on a regular schedule</li>
                      <li>Automatic work order creation for scheduled services</li>
                      <li>Automatic billing to your payment method on file</li>
                      <li>Service will continue until you cancel or modify your subscription</li>
                    </ul>
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <Checkbox 
                      id="subscription-consent" 
                      checked={subscriptionConsent}
                      onCheckedChange={(checked) => setSubscriptionConsent(checked as boolean)}
                    />
                    <label 
                      htmlFor="subscription-consent" 
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      I understand this is a recurring subscription service and agree to automatic billing
                    </label>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Status Messages for Finalized Quotes */}
          {quote.status === 'Approved' && (
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/50">
              <AlertDescription className="text-green-800 dark:text-green-200">
                <p className="font-medium">✓ This quote has been approved</p>
                <p className="text-sm mt-1">
                  If you need to make changes, please contact us directly.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {quote.status === 'Edits Requested' && (
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50">
              <AlertDescription className="text-blue-800 dark:text-blue-200">
                <p className="font-medium">✓ You've already requested changes to this quote</p>
                <p className="text-sm mt-1">
                  We'll review your feedback and send you an updated quote shortly.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {quote.status === 'Declined' && (
            <Alert className="border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-950/50">
              <AlertDescription className="text-gray-800 dark:text-gray-200">
                <p className="font-medium">This quote has been declined</p>
                <p className="text-sm mt-1">
                  Please contact us if you'd like to discuss alternatives.
                </p>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions - Only show for Sent or Viewed status */}
          {(quote.status === 'Sent' || quote.status === 'Viewed') && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    className="flex-1"
                    disabled={quote.isSubscription && !subscriptionConsent}
                    onClick={() => {
                      const approveUrl = `/quote-action?type=approve&quote_id=${encodeURIComponent(quote.id)}&token=${encodeURIComponent(quote.publicToken)}`;
                      window.location.href = approveUrl;
                    }}
                  >
                    Approve Quote
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      const editUrl = `/quote-edit/${encodeURIComponent(quote.id)}/${encodeURIComponent(quote.publicToken)}`;
                      window.location.href = editUrl;
                    }}
                  >
                    Request Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}