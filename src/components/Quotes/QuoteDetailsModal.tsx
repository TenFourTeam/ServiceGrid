import { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { formatMoney, formatDate } from '@/utils/format';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useCustomersData } from '@/queries/unified';
import LoadingScreen from '@/components/LoadingScreen';
import type { Quote, QuoteListItem, QuoteStatus } from '@/types';

const statusColors: Record<QuoteStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-800',
  'Sent': 'bg-blue-100 text-blue-800',
  'Viewed': 'bg-yellow-100 text-yellow-800',
  'Approved': 'bg-green-100 text-green-800',
  'Declined': 'bg-red-100 text-red-800',
  'Edits Requested': 'bg-orange-100 text-orange-800',
};

interface QuoteDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string | null;
  onSendQuote: (quote: Quote) => void;
}

export function QuoteDetailsModal({ open, onOpenChange, quoteId, onSendQuote }: QuoteDetailsModalProps) {
  const { data: customers = [] } = useCustomersData();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);

  const customerName = useMemo(() => {
    if (!quote) return '';
    const customer = customers.find(c => c.id === quote.customerId);
    return customer?.name || 'Unknown Customer';
  }, [customers, quote]);

  const customerEmail = useMemo(() => {
    if (!quote) return '';
    const customer = customers.find(c => c.id === quote.customerId);
    return customer?.email || '';
  }, [customers, quote]);

  useEffect(() => {
    if (!open || !quoteId) {
      setQuote(null);
      return;
    }

    const fetchQuote = async () => {
      setLoading(true);
      try {
        const fullQuote = await edgeRequest(fn(`quotes?id=${quoteId}`), {
          method: 'GET',
        });
        setQuote(fullQuote);
      } catch (error) {
        console.error('Failed to fetch quote:', error);
        toast.error('Failed to load quote details');
        onOpenChange(false);
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [open, quoteId, onOpenChange]);

  const handleConvertToJob = async () => {
    if (!quote) return;
    
    if (quote.status === 'Draft') {
      toast.error('Cannot convert draft quotes to jobs. Send the quote first.');
      return;
    }

    try {
      const result = await edgeRequest(fn('jobs'), {
        method: 'POST',
        body: JSON.stringify({
          quoteId: quote.id,
          customerId: quote.customerId,
          title: `Job from Quote ${quote.number}`,
          total: quote.total,
          status: 'Scheduled',
        }),
      });

      if (result.success) {
        toast.success('Quote converted to job successfully');
        onOpenChange(false);
        navigate('/calendar');
      }
    } catch (error) {
      console.error('Failed to convert quote to job:', error);
      toast.error('Failed to convert quote to job');
    }
  };

  const handleCreateInvoice = async () => {
    if (!quote) return;

    if (quote.status === 'Draft') {
      toast.error('Cannot create invoice from draft quotes. Send the quote first.');
      return;
    }

    try {
      const result = await edgeRequest(fn('invoices'), {
        method: 'POST',
        body: JSON.stringify({
          quoteId: quote.id,
          customerId: quote.customerId,
          status: 'Draft',
          total: quote.total,
        }),
      });

      if (result.success) {
        toast.success('Invoice created from quote successfully');
        onOpenChange(false);
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Failed to create invoice from quote:', error);
      toast.error('Failed to create invoice from quote');
    }
  };

  if (loading) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <div className="h-96">
            <LoadingScreen />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center justify-between">
            <span>Quote {quote?.number || ''}</span>
            {quote && (
              <Badge className={statusColors[quote.status]}>
                {quote.status}
              </Badge>
            )}
          </DrawerTitle>
        </DrawerHeader>

        {quote && (
          <div className="px-4 pb-4 overflow-y-auto">
            {/* Quote Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div>
                <div className="text-sm text-muted-foreground">Customer</div>
                <div className="font-medium">{customerName}</div>
                {customerEmail && (
                  <div className="text-sm text-muted-foreground">{customerEmail}</div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Total</div>
                <div className="font-medium text-lg">{formatMoney(quote.total)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Created</div>
                <div>{formatDate(quote.createdAt)}</div>
              </div>
              {quote.sentAt && (
                <div>
                  <div className="text-sm text-muted-foreground">Sent</div>
                  <div>{formatDate(quote.sentAt)}</div>
                </div>
              )}
            </div>

            <Separator className="mb-6" />

            {/* Line Items */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quote.lineItems?.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.qty} {item.unit || ''}</TableCell>
                        <TableCell>{formatMoney(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatMoney(item.lineTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Separator className="my-4" />

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatMoney(quote.subtotal)}</span>
                  </div>
                  {quote.taxRate > 0 && (
                    <div className="flex justify-between">
                      <span>Tax ({(quote.taxRate * 100).toFixed(1)}%)</span>
                      <span>{formatMoney(Math.round(quote.subtotal * quote.taxRate))}</span>
                    </div>
                  )}
                  {quote.discount > 0 && (
                    <div className="flex justify-between">
                      <span>Discount</span>
                      <span>-{formatMoney(quote.discount)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatMoney(quote.total)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terms and Notes */}
            {(quote.terms || quote.notesInternal) && (
              <Card>
                <CardContent className="pt-6">
                  {quote.terms && (
                    <div className="mb-4">
                      <div className="text-sm font-medium text-muted-foreground mb-2">Terms</div>
                      <div className="text-sm">{quote.terms}</div>
                    </div>
                  )}
                  {quote.notesInternal && (
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Internal Notes</div>
                      <div className="text-sm">{quote.notesInternal}</div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <DrawerFooter>
          <div className="flex gap-2 justify-end">
            {quote && (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => onSendQuote(quote)}
                >
                  Send Quote
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleConvertToJob}
                >
                  Convert to Job
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCreateInvoice}
                >
                  Create Invoice
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}