import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, CreditCard, AlertCircle } from 'lucide-react';
import type { FinancialSummary } from '@/types/customerPortal';

interface FinancialSummaryWidgetProps {
  summary: FinancialSummary;
  onPayNow?: () => void;
}

export function FinancialSummaryWidget({ summary, onPayNow }: FinancialSummaryWidgetProps) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Financial Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Amount Owed</p>
            <p className={`text-2xl font-bold ${summary.totalOwed > 0 ? 'text-orange-600' : 'text-foreground'}`}>
              {formatCurrency(summary.totalOwed)}
            </p>
            {summary.overdueCount > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3" />
                {summary.overdueCount} overdue
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Paid</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.totalPaid)}
            </p>
          </div>
        </div>

        {summary.totalOwed > 0 && onPayNow && (
          <Button onClick={onPayNow} className="w-full">
            <CreditCard className="mr-2 h-4 w-4" />
            Pay Now
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
