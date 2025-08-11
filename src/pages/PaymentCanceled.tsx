import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function PaymentCanceled() {
  useEffect(() => {
    document.title = 'Payment Canceled';
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-md w-full text-center space-y-4">
        <h1 className="text-2xl font-semibold">Payment Canceled</h1>
        <p className="text-muted-foreground">Your checkout was canceled. You can retry anytime.</p>
        <div className="flex items-center justify-center gap-2">
          <Button onClick={() => window.location.assign('/')} variant="outline">Home</Button>
          <Button onClick={() => window.location.assign('/invoices')}>Back to Invoices</Button>
        </div>
      </section>
    </main>
  );
}
