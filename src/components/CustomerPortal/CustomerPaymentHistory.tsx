import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, CreditCard, Banknote, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import type { CustomerPayment } from '@/types/customerPortal';

interface CustomerPaymentHistoryProps {
  payments: CustomerPayment[];
}

export function CustomerPaymentHistory({ payments }: CustomerPaymentHistoryProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'card':
      case 'credit_card':
      case 'stripe':
        return CreditCard;
      case 'cash':
        return Banknote;
      case 'check':
      case 'bank':
        return Building2;
      default:
        return Receipt;
    }
  };

  const getMethodLabel = (method: string, last4?: string | null) => {
    switch (method.toLowerCase()) {
      case 'card':
      case 'credit_card':
      case 'stripe':
        return last4 ? `Card •••• ${last4}` : 'Card';
      case 'cash':
        return 'Cash';
      case 'check':
        return 'Check';
      case 'bank':
        return 'Bank Transfer';
      default:
        return method;
    }
  };

  if (payments.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No payment history</p>
        </CardContent>
      </Card>
    );
  }

  // Group payments by month
  const groupedPayments = payments.reduce((acc, payment) => {
    const monthKey = format(new Date(payment.received_at), 'MMMM yyyy');
    if (!acc[monthKey]) {
      acc[monthKey] = [];
    }
    acc[monthKey].push(payment);
    return acc;
  }, {} as Record<string, CustomerPayment[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedPayments).map(([month, monthPayments]) => (
        <div key={month}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{month}</h3>
          <div className="space-y-3">
            {monthPayments.map((payment) => {
              const MethodIcon = getMethodIcon(payment.method);
              return (
                <Card key={payment.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                          <MethodIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="font-medium">
                            Invoice #{payment.invoice_number}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(payment.received_at), 'MMM d, yyyy • h:mm a')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-green-600 dark:text-green-400">
                          {formatCurrency(payment.amount)}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {getMethodLabel(payment.method, payment.last4)}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
