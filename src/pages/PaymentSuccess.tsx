import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { edgePublicJson } from '@/utils/edgeApi';

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
        const data = await edgePublicJson('verify-payment', {
          method: 'POST',
          body: { session_id: sessionId }
        });
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
      } catch (e: any) {
        setStatus('error');
        setMessage(e?.message || 'Verification failed.');
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
