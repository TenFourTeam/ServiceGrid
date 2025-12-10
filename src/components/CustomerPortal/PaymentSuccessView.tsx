import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentSuccessViewProps {
  invoiceNumber: string;
  amount: number;
  onClose: () => void;
}

export function PaymentSuccessView({ invoiceNumber, amount, onClose }: PaymentSuccessViewProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center space-y-6">
      <div className="relative">
        <div className="absolute inset-0 animate-ping rounded-full bg-green-500/20" />
        <div className="relative rounded-full bg-green-500/10 p-4">
          <CheckCircle2 className="h-16 w-16 text-green-500" />
        </div>
      </div>
      
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-foreground">Payment Successful!</h2>
        <p className="text-muted-foreground">
          Your payment of {formatCurrency(amount)} for Invoice #{invoiceNumber} has been processed.
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 w-full max-w-xs">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Invoice</span>
          <span className="font-medium">#{invoiceNumber}</span>
        </div>
        <div className="flex justify-between text-sm mt-2">
          <span className="text-muted-foreground">Amount Paid</span>
          <span className="font-medium text-green-600">{formatCurrency(amount)}</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        A receipt has been sent to your email.
      </p>

      <Button onClick={onClose} className="w-full max-w-xs">
        Done
      </Button>
    </div>
  );
}
