import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Receipt, Loader2, Eye, Download, CreditCard, PenLine } from 'lucide-react';
import { format } from 'date-fns';
import { useCustomerJobData } from '@/hooks/useCustomerJobData';
import { CustomerQuoteDetail } from './CustomerQuoteDetail';
import { CustomerPaymentHistory } from './CustomerPaymentHistory';
import { InvoicePaymentModal } from './InvoicePaymentModal';
import { CustomerInvoiceDetail } from './CustomerInvoiceDetail';
import type { CustomerQuote, CustomerInvoice, CustomerBusiness } from '@/types/customerPortal';
import { buildEdgeFunctionUrl } from '@/utils/env';
import { toast } from 'sonner';

export function CustomerDocuments() {
  const { data: jobData, isLoading, error, refetch } = useCustomerJobData();
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
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
  const payments = jobData?.payments || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Documents</h2>
        <p className="text-muted-foreground">
          View your quotes, invoices, and payment history
        </p>
      </div>

      <Tabs defaultValue="quotes">
        <TabsList className="overflow-x-auto">
          <TabsTrigger value="quotes" className="gap-2">
            <FileText className="h-4 w-4" />
            Quotes ({quotes.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-2">
            <Receipt className="h-4 w-4" />
            Invoices ({invoices.length})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Payments ({payments.length})
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
                <QuoteCard 
                  key={quote.id} 
                  quote={quote} 
                  onView={() => setSelectedQuoteId(quote.id)}
                />
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
                <InvoiceCard 
                  key={invoice.id} 
                  invoice={invoice}
                  business={jobData?.business}
                  onViewDetails={() => setSelectedInvoiceId(invoice.id)}
                  onPaymentComplete={() => refetch()}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <CustomerPaymentHistory payments={payments} />
        </TabsContent>
      </Tabs>

      <CustomerQuoteDetail 
        quoteId={selectedQuoteId}
        open={!!selectedQuoteId}
        onOpenChange={(open) => !open && setSelectedQuoteId(null)}
      />

      <CustomerInvoiceDetail
        invoiceId={selectedInvoiceId}
        open={!!selectedInvoiceId}
        onOpenChange={(open) => !open && setSelectedInvoiceId(null)}
        onPaymentComplete={() => refetch()}
      />
    </div>
  );
}

interface QuoteCardProps {
  quote: CustomerQuote;
  onView: () => void;
}

function QuoteCard({ quote, onView }: QuoteCardProps) {
  const [downloading, setDownloading] = useState(false);

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
      case 'Edits Requested': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handlePrintPdf = async () => {
    setDownloading(true);
    try {
      const sessionToken = localStorage.getItem('customer_session_token');
      const response = await fetch(
        buildEdgeFunctionUrl('generate-document-pdf', { 
          type: 'quote', 
          id: quote.id 
        }),
        {
          headers: {
            'x-session-token': sessionToken || '',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to generate document');

      const html = await response.text();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => printWindow.print();
      }
    } catch (error) {
      toast.error('Failed to generate document');
    } finally {
      setDownloading(false);
    }
  };

  const canTakeAction = quote.status === 'Sent';

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
          <div className="flex items-center gap-1.5">
            <Badge className={getStatusColor(quote.status)}>
              {quote.status}
            </Badge>
            {quote.status === 'Approved' && quote.signature_data_url && (
              <span className="inline-flex items-center gap-0.5 text-xs text-green-600 bg-green-50 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                <PenLine className="h-3 w-3" />
                Signed
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-2xl font-bold">{formatCurrency(quote.total)}</p>
            {quote.deposit_required && quote.deposit_percent && (
              <p className="text-xs text-muted-foreground">
                {quote.deposit_percent}% deposit required
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon"
              onClick={handlePrintPdf}
              disabled={downloading}
              title="Print / Save as PDF"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </Button>
            <Button onClick={onView}>
              <Eye className="mr-2 h-4 w-4" />
              {canTakeAction ? 'Review & Accept' : 'View Quote'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface InvoiceCardProps {
  invoice: CustomerInvoice;
  business?: CustomerBusiness;
  onViewDetails: () => void;
  onPaymentComplete?: () => void;
}

function InvoiceCard({ invoice, business, onViewDetails, onPaymentComplete }: InvoiceCardProps) {
  const [downloading, setDownloading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);

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

  const handlePrintPdf = async () => {
    setDownloading(true);
    try {
      const sessionToken = localStorage.getItem('customer_session_token');
      const response = await fetch(
        buildEdgeFunctionUrl('generate-document-pdf', { 
          type: 'invoice', 
          id: invoice.id 
        }),
        {
          headers: {
            'x-session-token': sessionToken || '',
          },
        }
      );

      if (!response.ok) throw new Error('Failed to generate document');

      const html = await response.text();
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.onload = () => printWindow.print();
      }
    } catch (error) {
      toast.error('Failed to generate document');
    } finally {
      setDownloading(false);
    }
  };

  const canPay = invoice.status !== 'Paid' && invoice.status !== 'Draft';

  return (
    <>
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
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-2xl font-bold">{formatCurrency(invoice.total)}</p>
              {invoice.paid_at && (
                <p className="text-xs text-green-600">
                  Paid on {format(new Date(invoice.paid_at), 'MMM d, yyyy')}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={handlePrintPdf}
                disabled={downloading}
                title="Print / Save as PDF"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
              </Button>
              <Button variant="outline" onClick={onViewDetails}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </Button>
              {canPay && (
                <Button onClick={() => setShowPayment(true)}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Pay Now
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <InvoicePaymentModal
        invoice={invoice}
        business={business}
        open={showPayment}
        onOpenChange={setShowPayment}
        onPaymentComplete={onPaymentComplete}
      />
    </>
  );
}
