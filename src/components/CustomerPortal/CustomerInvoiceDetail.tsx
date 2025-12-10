import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useCustomerInvoiceDetail } from '@/hooks/useCustomerInvoiceDetail';
import { formatMoney } from '@/utils/format';
import { format, isPast, parseISO } from 'date-fns';
import { 
  Loader2, MapPin, Calendar, FileText, Download, 
  CreditCard, Clock, CheckCircle2, AlertCircle, Receipt
} from 'lucide-react';
import { InvoicePaymentModal } from './InvoicePaymentModal';
import type { CustomerInvoice } from '@/types/customerPortal';

interface CustomerInvoiceDetailProps {
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentComplete?: () => void;
}

export function CustomerInvoiceDetail({ invoiceId, open, onOpenChange, onPaymentComplete }: CustomerInvoiceDetailProps) {
  const { data, isLoading, error, refetch } = useCustomerInvoiceDetail(invoiceId);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const getStatusColor = (status: string, dueAt: string | null) => {
    if (status === 'Paid') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'Sent' && dueAt && isPast(parseISO(dueAt))) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }
    if (status === 'Sent') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    if (status === 'Draft') return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    if (status === 'Void') return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string, dueAt: string | null) => {
    if (status === 'Sent' && dueAt && isPast(parseISO(dueAt))) {
      return 'Overdue';
    }
    return status;
  };

  const handleDownloadPdf = async () => {
    if (!data?.invoice?.public_token) return;
    
    const printWindow = window.open(
      `/invoice/${data.invoice.public_token}`,
      '_blank'
    );
    if (printWindow) {
      printWindow.onload = () => {
        setTimeout(() => printWindow.print(), 500);
      };
    }
  };

  const canPay = data?.invoice?.status === 'Sent';
  const isOverdue = data?.invoice?.due_at && isPast(parseISO(data.invoice.due_at)) && data.invoice.status !== 'Paid';

  // Build a CustomerInvoice-compatible object for the payment modal
  const invoiceForPayment: CustomerInvoice | null = data?.invoice ? {
    id: data.invoice.id,
    number: data.invoice.number,
    status: data.invoice.status,
    total: data.invoice.total,
    created_at: data.invoice.created_at,
    due_at: data.invoice.due_at,
    paid_at: data.invoice.paid_at,
    public_token: data.invoice.public_token,
    deposit_required: data.invoice.deposit_required,
    deposit_percent: data.invoice.deposit_percent,
  } : null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice Details</span>
              {data?.invoice && (
                <Badge className={getStatusColor(data.invoice.status, data.invoice.due_at)}>
                  {getStatusLabel(data.invoice.status, data.invoice.due_at)}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {error && (
            <div className="text-center py-8">
              <p className="text-destructive">Failed to load invoice details</p>
            </div>
          )}

          {data?.invoice && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {data.business.logo_url && (
                      <img 
                        src={data.business.logo_url} 
                        alt={data.business.name} 
                        className="h-8 object-contain" 
                      />
                    )}
                    <span className="text-lg font-semibold">{data.business.name}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Invoice #{data.invoice.number}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {format(new Date(data.invoice.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Due Date Info */}
              {data.invoice.due_at && (
                <div className={`flex items-center gap-2 text-sm ${isOverdue ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <Clock className="h-4 w-4" />
                  <span>
                    Due: {format(new Date(data.invoice.due_at), 'MMM d, yyyy')}
                    {isOverdue && ' (Overdue)'}
                  </span>
                </div>
              )}

              {/* Address */}
              {data.invoice.address && (
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{data.invoice.address}</span>
                </div>
              )}

              {/* Related Job/Quote */}
              {(data.invoice.job || data.invoice.quote) && (
                <div className="flex flex-wrap gap-2">
                  {data.invoice.job && (
                    <Badge variant="outline">
                      Work Order: {data.invoice.job.title || 'Untitled'}
                    </Badge>
                  )}
                  {data.invoice.quote && (
                    <Badge variant="outline">
                      Quote: {data.invoice.quote.number}
                    </Badge>
                  )}
                </div>
              )}

              {/* Terms / Work Description */}
              {data.invoice.terms && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Description
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {data.invoice.terms}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Line Items */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Services & Materials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.invoice.invoice_line_items
                    .sort((a, b) => a.position - b.position)
                    .map((item, index) => (
                      <div key={item.id}>
                        {index > 0 && <Separator className="my-3" />}
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {item.qty} {item.unit || 'unit'}{item.qty > 1 ? 's' : ''} × {formatMoney(item.unit_price)}
                            </div>
                          </div>
                          <div className="font-semibold whitespace-nowrap">
                            {formatMoney(item.line_total)}
                          </div>
                        </div>
                      </div>
                    ))}

                  <Separator className="my-4" />

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatMoney(data.invoice.subtotal)}</span>
                    </div>

                    {data.invoice.discount > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount</span>
                        <span>-{formatMoney(data.invoice.discount)}</span>
                      </div>
                    )}

                    {data.invoice.tax_rate > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Tax ({(data.invoice.tax_rate * 100).toFixed(1)}%)
                        </span>
                        <span>
                          {formatMoney(Math.round((data.invoice.subtotal - data.invoice.discount) * data.invoice.tax_rate))}
                        </span>
                      </div>
                    )}

                    <Separator />

                    <div className="flex justify-between text-xl font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatMoney(data.invoice.total)}</span>
                    </div>

                    {data.invoice.deposit_required && data.invoice.deposit_percent && (
                      <Alert>
                        <AlertDescription>
                          Deposit required: {formatMoney(Math.round(data.invoice.total * (data.invoice.deposit_percent / 100)))} ({data.invoice.deposit_percent}%)
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Payment History */}
              {data.payments && data.payments.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Receipt className="h-4 w-4" />
                      Payment History
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {data.payments.map((payment, index) => (
                      <div key={payment.id}>
                        {index > 0 && <Separator className="my-3" />}
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="font-medium">{formatMoney(payment.amount)}</span>
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {payment.method}
                              {payment.last4 && ` •••• ${payment.last4}`}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(payment.received_at), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Paid Status */}
              {data.invoice.status === 'Paid' && data.invoice.paid_at && (
                <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-700 dark:text-green-300">
                    Paid on {format(new Date(data.invoice.paid_at), 'MMM d, yyyy')}
                  </AlertDescription>
                </Alert>
              )}

              {/* Overdue Warning */}
              {isOverdue && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This invoice is overdue. Please make a payment as soon as possible.
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownloadPdf}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                {canPay && (
                  <Button
                    className="flex-1"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Invoice
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Modal */}
      {invoiceForPayment && (
        <InvoicePaymentModal
          invoice={invoiceForPayment}
          business={data?.business}
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
          onPaymentComplete={() => {
            refetch();
            onPaymentComplete?.();
          }}
        />
      )}
    </>
  );
}
