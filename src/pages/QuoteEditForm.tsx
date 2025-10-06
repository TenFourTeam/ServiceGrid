import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatMoney } from '@/utils/format';
import { buildEdgeFunctionUrl } from '@/utils/env';
import { queryKeys } from '@/queries/keys';

export default function QuoteEditForm() {
  const { quoteId, token } = useParams<{ quoteId: string; token: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [quote, setQuote] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const MAX_CHARS = 1000;

  useEffect(() => {
    document.title = 'Request Quote Changes • ServiceGrid';
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
      if (!quoteId || !token) {
        setError('Missing quote information');
        setLoading(false);
        return;
      }

      try {
        const url = buildEdgeFunctionUrl('quote-view', {
          id: quoteId,
          token
        });
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Failed to load quote (${response.status})`);
        }
        
        const data = await response.json();
        setQuote(data);
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch quote:', err);
        setError(err.message || 'Failed to load quote');
        setLoading(false);
      }
    }

    fetchQuote();
  }, [quoteId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerNotes.trim()) {
      setError('Please describe the changes you would like');
      return;
    }

    if (!quoteId || !token) {
      setError('Missing quote information');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const url = buildEdgeFunctionUrl('quote-events', {
        type: 'edit',
        quote_id: quoteId,
        token
      });

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_notes: customerNotes.trim()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to submit request (${response.status})`);
      }

      // Redirect to confirmation page
      navigate(`/quote-action?type=edit&quote_id=${encodeURIComponent(quoteId)}&token=${encodeURIComponent(token)}`);
    } catch (err: any) {
      console.error('Failed to submit edit request:', err);
      setError(err.message || 'Failed to submit your request. Please try again.');
      setSubmitting(false);
    }
  };

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

  if (error && !quote) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <main className="max-w-2xl mx-auto p-6">
          <Card>
            <CardHeader>
              <CardTitle>Unable to Load Quote</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">{error}</p>
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
      <main className="max-w-2xl mx-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Request Changes to Quote</h1>
            <p className="text-muted-foreground mt-1">
              Let us know what changes you would like made to this quote
            </p>
          </div>

          {/* Quote Summary */}
          {quote && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Quote {quote.number}</span>
                  <Badge variant="secondary">{quote.status}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Amount</span>
                    <span className="font-semibold text-lg">{formatMoney(quote.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created</span>
                    <span>{new Date(quote.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Feedback Form */}
          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>What would you like to change?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="customer-notes">
                    Please describe the changes you need
                  </Label>
                  <Textarea
                    id="customer-notes"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Example: Please change the quantity from 3 windows to 2 windows, or adjust the service date to next week..."
                    className="min-h-[150px]"
                    maxLength={MAX_CHARS}
                    required
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Be as specific as possible to help us update your quote quickly</span>
                    <span>{customerNotes.length}/{MAX_CHARS}</span>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.history.back()}
                    disabled={submitting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !customerNotes.trim()}
                    className="flex-1"
                  >
                    {submitting ? 'Submitting...' : 'Submit Feedback'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      </main>
    </div>
  );
}
