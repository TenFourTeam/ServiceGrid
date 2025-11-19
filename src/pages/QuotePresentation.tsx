import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QuotePresentationView } from '@/components/Quotes/QuotePresentationView';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buildEdgeFunctionUrl } from '@/utils/env';
import { CheckCircle2 } from 'lucide-react';
import type { Quote } from '@/types';

export default function QuotePresentation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [businessLogo, setBusinessLogo] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    document.title = 'Quote Presentation • ServiceGrid';
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
        setCustomerName(data.customerName || '');
        setBusinessName(data.businessName || '');
        setBusinessLogo(data.businessLogo || '');
        setLoading(false);
      } catch (err: any) {
        console.error('Failed to fetch quote:', err);
        setError(err.message || 'Failed to load quote');
        setLoading(false);
      }
    }

    fetchQuote();
  }, [token]);

  const handleAccept = async (signature: string) => {
    if (!token || !quote) return;

    try {
      const url = buildEdgeFunctionUrl('quotes-crud', {});
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          token,
          quoteId: quote.id,
          signature
        })
      });

      if (!response.ok) {
        throw new Error('Failed to accept quote');
      }

      setAccepted(true);
      
      // Track acceptance event
      const eventUrl = buildEdgeFunctionUrl('quote-events', {
        type: 'approve',
        quote_id: quote.id,
        token
      });
      await fetch(eventUrl);
    } catch (err: any) {
      console.error('Failed to accept quote:', err);
      alert(err.message || 'Failed to accept quote. Please try again.');
    }
  };

  const handleDecline = async () => {
    if (!token || !quote) return;

    try {
      const url = buildEdgeFunctionUrl('quotes-crud', {});
      const response = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline',
          token,
          quoteId: quote.id
        })
      });

      if (!response.ok) {
        throw new Error('Failed to decline quote');
      }

      alert('Quote declined. You can close this window.');
      
      // Track decline event
      const eventUrl = buildEdgeFunctionUrl('quote-events', {
        type: 'edit',
        quote_id: quote.id,
        token
      });
      await fetch(eventUrl);
    } catch (err: any) {
      console.error('Failed to decline quote:', err);
      alert(err.message || 'Failed to decline quote. Please try again.');
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

  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">Quote Accepted!</h2>
              <p className="text-muted-foreground">
                Thank you for accepting this quote. {businessName} will be in touch shortly to schedule your service.
              </p>
            </div>
            <Button onClick={() => window.close()} className="w-full">
              Close Window
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <QuotePresentationView
      quote={quote}
      customerName={customerName}
      businessName={businessName}
      businessLogo={businessLogo}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
}
