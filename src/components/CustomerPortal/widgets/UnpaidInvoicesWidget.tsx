import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, AlertCircle, ChevronRight, FileText } from 'lucide-react';
import { CustomerInvoice } from '@/types/customerPortal';
import { format, isPast, parseISO } from 'date-fns';

interface UnpaidInvoicesWidgetProps {
  invoices: CustomerInvoice[];
  onPayInvoice: (invoice: CustomerInvoice) => void;
  onViewAll: () => void;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export function UnpaidInvoicesWidget({ 
  invoices, 
  onPayInvoice, 
  onViewAll 
}: UnpaidInvoicesWidgetProps) {
  // Filter unpaid invoices and sort: overdue first, then by due date
  const unpaidInvoices = invoices
    .filter(inv => inv.status !== 'Paid')
    .sort((a, b) => {
      const aOverdue = a.due_at && isPast(parseISO(a.due_at));
      const bOverdue = b.due_at && isPast(parseISO(b.due_at));
      
      // Overdue items first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      // Then by due date (earliest first)
      if (a.due_at && b.due_at) {
        return parseISO(a.due_at).getTime() - parseISO(b.due_at).getTime();
      }
      return 0;
    });

  const displayInvoices = unpaidInvoices.slice(0, 3);
  const hasMore = unpaidInvoices.length > 3;

  if (unpaidInvoices.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="h-5 w-5 text-primary" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <div className="rounded-full bg-muted p-3 mb-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              No outstanding invoices
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              You're all caught up!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <CreditCard className="h-5 w-5 text-primary" />
          Invoices Awaiting Payment
          {unpaidInvoices.length > 0 && (
            <Badge variant="secondary" className="ml-auto">
              {unpaidInvoices.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {displayInvoices.map((invoice) => {
          const isOverdue = invoice.due_at && isPast(parseISO(invoice.due_at));
          
          return (
            <div
              key={invoice.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isOverdue 
                  ? 'border-destructive/50 bg-destructive/5' 
                  : 'border-border bg-muted/30'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    Invoice #{invoice.number}
                  </span>
                  {isOverdue ? (
                    <Badge variant="destructive" className="text-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Overdue
                    </Badge>
                  ) : invoice.due_at ? (
                    <Badge variant="outline" className="text-xs">
                      Due {format(parseISO(invoice.due_at), 'MMM d')}
                    </Badge>
                  ) : null}
                </div>
                <p className={`text-lg font-semibold mt-0.5 ${
                  isOverdue ? 'text-destructive' : 'text-foreground'
                }`}>
                  {formatCurrency(invoice.total)}
                </p>
              </div>
              
              <Button
                size="sm"
                onClick={() => onPayInvoice(invoice)}
                className="shrink-0"
              >
                Pay Now
              </Button>
            </div>
          );
        })}

        {hasMore && (
          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground hover:text-foreground"
            onClick={onViewAll}
          >
            View All Invoices
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
