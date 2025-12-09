import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Receipt, ExternalLink, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useCustomerJobData } from '@/hooks/useCustomerJobData';
import type { CustomerQuote, CustomerInvoice } from '@/types/customerPortal';

export function CustomerDocuments() {
  const { data: jobData, isLoading, error } = useCustomerJobData();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getQuoteStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'Declined': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'Draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load documents</p>
      </div>
    );
  }

  const quotes = jobData?.quotes || [];
  const invoices = jobData?.invoices || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Documents</h2>
        <p className="text-muted-foreground">
          View your quotes, invoices, and contracts
        </p>
      </div>

      <Tabs defaultValue="quotes">
        <TabsList>
          <TabsTrigger value="quotes" className="gap-2">
            <FileText className="h-4 w-4" />
            Quotes ({quotes.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt className="h-4 w-4" />
            Invoices ({invoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="mt-4">
          {quotes.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No quotes yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {quotes.map((quote) => (
                <QuoteCard key={quote.id} quote={quote} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          {invoices.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No invoices yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function QuoteCard({ quote }: { quote: CustomerQuote }) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      case 'Declined': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const quoteUrl = `/quote-present/${quote.public_token}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Quote #{quote.number}</CardTitle>
            <CardDescription>
              Created {format(new Date(quote.created_at), 'MMM d, yyyy')}
            </CardDescription>
          </div>
          <Badge className={getStatusColor(quote.status)}>
            {quote.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(quote.total)}</p>
            {quote.deposit_required && quote.deposit_percent && (
              <p className="text-xs text-muted-foreground">
                {quote.deposit_percent}% deposit required
              </p>
            )}
          </div>
          <Button asChild>
            <a href={quoteUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Quote
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function InvoiceCard({ invoice }: { invoice: CustomerInvoice }) {
  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'Sent': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'Overdue': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'Draft': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const invoiceUrl = `/invoice-pay?token=${invoice.public_token}`;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">Invoice #{invoice.number}</CardTitle>
            <CardDescription>
              {invoice.due_at 
                ? `Due ${format(new Date(invoice.due_at), 'MMM d, yyyy')}`
                : `Created ${format(new Date(invoice.created_at), 'MMM d, yyyy')}`
              }
            </CardDescription>
          </div>
          <Badge className={getStatusColor(invoice.status)}>
            {invoice.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(invoice.total)}</p>
            {invoice.paid_at && (
              <p className="text-xs text-green-600">
                Paid on {format(new Date(invoice.paid_at), 'MMM d, yyyy')}
              </p>
            )}
          </div>
          <Button 
            asChild 
            variant={invoice.status === 'Paid' ? 'outline' : 'default'}
          >
            <a href={invoiceUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              {invoice.status === 'Paid' ? 'View Invoice' : 'Pay Now'}
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
