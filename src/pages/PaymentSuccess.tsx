import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function PaymentSuccess() {
  const [status, setStatus] = useState<'pending' | 'paid' | 'error'>('pending');
  const [message, setMessage] = useState<string>('Verifying your payment...');

  useEffect(() => {
    document.title = 'Payment Success';
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) {
      setStatus('error');
      setMessage('Missing session ID.');
      return;
    }
    (async () => {
      try {
        const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/verify-payment', {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionId })
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
          if ((data as any)?.status === 'paid') {
            const receiptSent = (data as any)?.receipt_sent === true;
            setStatus('paid');
            setMessage(receiptSent ? 'Payment confirmed. Receipt emailed to you.' : 'Payment confirmed. Thank you!');
          } else if ((data as any)?.status) {
            setStatus('pending');
            setMessage('Payment is still pending. You may refresh this page shortly.');
          } else if ((data as any)?.error) {
            throw new Error((data as any).error);
        } else {
          setStatus('error');
          setMessage('Verification failed.');
        }
      } catch (e: Error | unknown) {
        setStatus('error');
        setMessage((e instanceof Error ? e.message : null) || 'Verification failed.');
      }
    })();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold">Invoice Payment</h1>
        <p className="text-muted-foreground">{message}</p>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={() => window.location.assign('/')} variant="outline">Home</Button>
          <Button onClick={() => window.location.assign('/invoices')}>View Invoices</Button>
        </div>
      </section>
    </main>
  );
}
