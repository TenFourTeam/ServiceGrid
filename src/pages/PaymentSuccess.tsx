import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { session_id: sessionId }
        });
        if (error) throw new Error(error.message);
        if ((data as any)?.status === 'paid') {
          setStatus('paid');
          setMessage('Payment confirmed. Thank you!');
        } else {
          setStatus('pending');
          setMessage('Payment is still pending. You may refresh this page shortly.');
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
