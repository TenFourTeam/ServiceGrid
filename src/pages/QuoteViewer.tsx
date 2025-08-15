import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, PhoneIcon, MailIcon } from 'lucide-react';
import type { Quote } from '@/types';
import { formatMoney } from '@/utils/format';
import { buildEdgeFunctionUrl } from '@/utils/env';

export default function QuoteViewer() {
  const { token } = useParams<{ token: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

          {/* Quote Details */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="font-medium">Customer ID: {quote.customerId}</div>
                {quote.address && (
                  <div className="text-sm text-muted-foreground">
                    {quote.address}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {quote.terms && (
                  <div className="text-sm text-muted-foreground">
                    {quote.terms}
                  </div>
                )}
                {quote.notesInternal && (
                  <div className="text-sm text-muted-foreground">
                    Notes: {quote.notesInternal}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Line Items */}
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

          {/* Actions */}
          {quote.status === 'Sent' && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    className="flex-1"
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
                      const editUrl = `/quote-action?type=edit&quote_id=${encodeURIComponent(quote.id)}&token=${encodeURIComponent(quote.publicToken)}`;
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