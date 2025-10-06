import { useState, useEffect, useMemo } from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { CalendarIcon, Send, DollarSign, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatDate, formatMoney, formatCurrencyInputNoSymbol, parseCurrencyInput, sanitizeMoneyTyping } from '@/utils/format';
import { useCustomersData, useQuotesData } from '@/queries/unified';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useRecordPayment, useDeleteInvoice } from '@/hooks/useInvoiceOperations';
import { useInvoicePayments } from '@/hooks/useInvoicePayments';
import { useJobsData } from '@/hooks/useJobsData';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useQueryClient } from '@tanstack/react-query';
import { invalidationHelpers, queryKeys } from '@/queries/keys';
import { generateInvoiceEmail } from '@/utils/emailTemplateEngine';
import { escapeHtml } from '@/utils/sanitize';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import JobShowModal from '@/components/Jobs/JobShowModal';
import PickJobModal from '@/components/Jobs/PickJobModal';
import PickQuoteModal from '@/components/Jobs/PickQuoteModal';
import { InvoiceForm, type InvoiceFormData } from '@/components/Invoices/InvoiceForm';
import type { Invoice, InvoicesCacheData } from '@/types';

export interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  mode?: 'view' | 'edit' | 'send' | 'create' | 'mark_paid';
  initialCustomerId?: string;
  onSuccess?: () => void;
}

export default function InvoiceModal({ 
  open, 
  onOpenChange, 
  invoice, 
  mode: initialMode = 'view',
  initialCustomerId,
  onSuccess 
}: InvoiceModalProps) {
  const isMobile = useIsMobile();
  const { business, businessName, businessLogoUrl, businessLightLogoUrl, businessId } = useBusinessContext();
  const { data: customers = [] } = useCustomersData();
  const { data: jobs = [] } = useJobsData(businessId);
  const { data: quotes = [] } = useQuotesData();
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const recordPaymentMutation = useRecordPayment();
  const deleteInvoice = useDeleteInvoice();
  const { t } = useLanguage();

  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showJobPicker, setShowJobPicker] = useState(false);
  const [showQuotePicker, setShowQuotePicker] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const { data: payments = [] } = useInvoicePayments({ 
    invoiceId: invoice?.id,
    enabled: !!invoice && mode === 'view' 
  });
  
  // Form state
  const [customerId, setCustomerId] = useState('');
  const [status, setStatus] = useState<'Draft' | 'Sent' | 'Paid' | 'Overdue'>('Draft');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [taxRate, setTaxRate] = useState(0);
  const [discount, setDiscount] = useState(0);
  
  // Send email state
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  // Payment recording state
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Check' | 'Card'>('Cash');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');

  const customerName = useMemo(() => {
    const customer = customers.find(c => c.id === (invoice?.customerId || customerId));
    return customer?.name || 'Unknown';
  }, [customers, invoice?.customerId, customerId]);

  const customerEmail = useMemo(() => {
    const customer = customers.find(c => c.id === (invoice?.customerId || customerId));
    return customer?.email || '';
  }, [customers, invoice?.customerId, customerId]);
  
  const relatedJob = useMemo(() => {
    if (!invoice?.jobId) return null;
    return jobs.find(job => job.id === invoice.jobId) || null;
  }, [jobs, invoice?.jobId]);

  const relatedQuote = useMemo(() => {
    if (!invoice?.quoteId) return null;
    return quotes.find(quote => quote.id === invoice.quoteId) || null;
  }, [quotes, invoice?.quoteId]);

  // Email templates
  const defaultEmailHTML = useMemo(() => {
    if (!invoice) return '';
    const { html } = generateInvoiceEmail({
      businessName,
      businessLogoUrl: businessLogoUrl as string,
      invoice: invoice
    });
    return html;
  }, [invoice, businessName, businessLogoUrl]);

  const defaultSubject = useMemo(() => {
    if (!invoice) return '';
    return `Invoice ${invoice.number} from ${businessName}`;
  }, [invoice, businessName]);

  const previewHtml = useMemo(() => {
    if (!invoice || !defaultEmailHTML) return '';
    const safe = escapeHtml(message).replace(/\n/g, '<br />');
    const introBlock = `<div style="margin-bottom:12px; line-height:1.6; font-size:14px; color:#111827;">${safe}</div>`;
    const hr = `<hr style="border:none; border-top:1px solid #e5e7eb; margin:12px 0;" />`;
    return `${introBlock}${hr}${defaultEmailHTML}`;
  }, [message, defaultEmailHTML, invoice]);

  // Reset form fields when modal opens/closes or invoice changes
  useEffect(() => {
    if (open && invoice) {
      setCustomerId(invoice.customerId);
      setStatus(invoice.status);
      setDueDate(invoice.dueAt ? new Date(invoice.dueAt) : undefined);
      setTaxRate(invoice.taxRate || 0);
      setDiscount(invoice.discount || 0);
      setTo(customerEmail);
      setSubject(defaultSubject);
      setMessage('');
      setPaymentAmount(invoice.total);
      setPaymentAmountInput(formatCurrencyInputNoSymbol(invoice.total));
      setPaymentDate(new Date());
      setPaymentMethod('Cash');
    } else if (open && !invoice && initialCustomerId) {
      setCustomerId(initialCustomerId);
      setStatus('Draft');
      setDueDate(undefined);
      setTaxRate(business?.taxRateDefault || 0);
      setDiscount(0);
      setTo('');
      setSubject('');
      setMessage('');
      setPaymentAmount(0);
      setPaymentAmountInput('0.00');
      setPaymentDate(new Date());
      setPaymentMethod('Cash');
    }
    setMode(initialMode);
  }, [open, invoice, initialCustomerId, initialMode, customerEmail, defaultSubject, business?.taxRateDefault]);

  const handleSave = async (formData: InvoiceFormData) => {
    if (!businessId) return;
    
    setLoading(true);
    try {
      const data = {
        customerId: formData.customerId,
        address: formData.address,
        taxRate: formData.taxRate,
        discount: formData.discount,
        subtotal: formData.lineItems.reduce((sum, item) => sum + item.lineTotal, 0),
        total: formData.lineItems.reduce((sum, item) => sum + item.lineTotal, 0) * (1 + formData.taxRate) - formData.discount,
        paymentTerms: formData.paymentTerms,
        frequency: formData.frequency,
        depositRequired: formData.depositRequired,
        depositPercent: formData.depositPercent,
        notesInternal: formData.notesInternal,
        terms: formData.terms,
        dueAt: formData.dueDate?.toISOString(),
        lineItems: formData.lineItems,
        jobId: invoice?.jobId,
        quoteId: invoice?.quoteId,
        status: 'Draft'
      };

      if (invoice) {
        // Update existing invoice
        await authApi.invoke('invoices-crud', {
          method: 'PUT',
          body: { id: invoice.id, ...data },
          toast: {
            success: `Invoice ${invoice.number} updated successfully`,
            loading: 'Updating invoice...',
            error: 'Failed to update invoice'
          }
        });
      } else {
        // Create new invoice
        const { data: response } = await authApi.invoke('invoices-crud', {
          method: 'POST',
          body: data,
          toast: {
            success: 'Invoice created successfully',
            loading: 'Creating invoice...',
            error: 'Failed to create invoice'
          }
        });

        // Optimistic update - add invoice to cache immediately
        if (response?.invoice && businessId) {
          queryClient.setQueryData(queryKeys.data.invoices(businessId), (oldData: InvoicesCacheData | undefined) => {
            if (oldData) {
              return {
                ...oldData,
                invoices: [response.invoice, ...oldData.invoices],
                count: oldData.count + 1
              };
            }
            return { invoices: [response.invoice], count: 1 };
          });
        }
      }

      invalidationHelpers.invoices(queryClient, businessId);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!invoice || !to.trim()) return;

    setLoading(true);
    try {
      // Generate payment URL using public token
      const payUrl = invoice.publicToken 
        ? `${window.location.origin}/invoice-pay?token=${invoice.publicToken}`
        : undefined;

      const { html: emailContent } = generateInvoiceEmail({
        businessName: businessName || 'Your Business',
        businessLogoUrl: businessLogoUrl as string,
        customerName,
        invoice: invoice,
        payUrl
      });

      const finalHtml = message.trim() ? `${message.replace(/\n/g, '<br>')}<hr style="border:none; border-top:1px solid #e5e7eb; margin:12px 0;">${emailContent}` : emailContent;

      await authApi.invoke('resend-send-email', {
        method: 'POST',
        body: {
          to: to.trim(),
          subject: subject || defaultSubject,
          html: finalHtml,
          invoice_id: invoice.id,
        },
        toast: {
          success: 'Invoice sent successfully',
          loading: 'Sending invoice...',
          error: 'Failed to send invoice'
        }
      });

      if (businessId) {
        invalidationHelpers.invoices(queryClient, businessId);
      }
      
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to send invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayOnline = async () => {
    if (!invoice) return;

    try {
      setLoading(true);
      
      const { data: response } = await authApi.invoke('create-invoice-payment', {
        method: 'POST',
        body: { invoiceId: invoice.id },
        toast: {
          loading: 'Creating payment link...',
          error: 'Failed to create payment link'
        }
      });

      if (response.url) {
        window.open(response.url, '_blank');
      }
    } catch (error) {
      console.error('Failed to initiate payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!invoice) return;

    try {
      setLoading(true);
      await recordPaymentMutation.mutateAsync({
        invoiceId: invoice.id,
        amount: paymentAmount,
        method: paymentMethod,
        paidAt: paymentDate.toISOString()
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to record payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;

    try {
      await deleteInvoice.mutateAsync(invoice.id);
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  const handleMarkSent = async () => {
    if (!invoice || !businessId) return;

    try {
      await authApi.invoke('invoices-crud', {
        method: 'PUT',
        body: {
          id: invoice.id,
          status: 'Sent',
        },
        toast: {
          success: `Invoice ${invoice.number} marked as sent`,
          loading: 'Updating invoice status...',
          error: 'Failed to update invoice status'
        }
      });

      invalidationHelpers.invoices(queryClient, businessId);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to mark invoice as sent:', error);
    }
  };

  const handleLinkJob = async (jobId: string) => {
    if (!invoice || !businessId) return;
    
    try {
      await authApi.invoke('invoices-crud', {
        method: 'PUT',
        body: { id: invoice.id, jobId },
        toast: {
          success: 'Work order linked successfully',
          loading: 'Linking work order...',
          error: 'Failed to link work order'
        }
      });
      
      invalidationHelpers.invoices(queryClient, businessId);
      setShowJobPicker(false);
    } catch (error) {
      console.error('Failed to link job:', error);
    }
  };

  const handleUnlinkJob = async () => {
    if (!invoice || !businessId) return;

    try {
      await authApi.invoke('invoices-crud', {
        method: 'PUT',
        body: { id: invoice.id, jobId: null },
        toast: {
          success: 'Work order unlinked successfully',
          loading: 'Unlinking work order...',
          error: 'Failed to unlink work order'
        }
      });
      
      invalidationHelpers.invoices(queryClient, businessId);
    } catch (error) {
      console.error('Failed to unlink job:', error);
    }
  };

  const handleLinkQuote = async (quoteId: string) => {
    if (!invoice || !businessId) return;

    try {
      await authApi.invoke('invoices-crud', {
        method: 'PUT',
        body: { id: invoice.id, quoteId },
        toast: {
          success: 'Quote linked successfully',
          loading: 'Linking quote...',
          error: 'Failed to link quote'
        }
      });
      
      invalidationHelpers.invoices(queryClient, businessId);
      setShowQuotePicker(false);
    } catch (error) {
      console.error('Failed to link quote:', error);
    }
  };

  const handleUnlinkQuote = async () => {
    if (!invoice || !businessId) return;

    try {
      await authApi.invoke('invoices-crud', {
        method: 'PUT',
        body: { id: invoice.id, quoteId: null },
        toast: {
          success: 'Quote unlinked successfully',
          loading: 'Unlinking quote...',
          error: 'Failed to unlink quote'
        }
      });
      
      invalidationHelpers.invoices(queryClient, businessId);
    } catch (error) {
      console.error('Failed to unlink quote:', error);
    }
  };

  const getModalTitle = () => {
    if (!invoice && mode === 'create') return 'Create Invoice';
    if (!invoice) return 'Invoice';
    
    switch (mode) {
      case 'send': return `Send Invoice ${invoice.number}`;
      case 'edit': return `Edit Invoice ${invoice.number}`;
      case 'mark_paid': return `Record Payment - Invoice ${invoice.number}`;
      default: return `Invoice ${invoice.number}`;
    }
  };

  const getModalDescription = () => {
    if (mode === 'send') return `Send invoice to ${customerName}`;
    if (mode === 'mark_paid') return `Record payment for ${customerName}`;
    if (!invoice) return 'Create a new invoice';
    return `${customerName} • ${invoice.status}${invoice.dueAt ? ` • Due ${formatDate(invoice.dueAt)}` : ''}`;
  };

  const renderContent = () => {
    if (mode === 'mark_paid') {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-md">
            <span className="text-sm font-medium">Invoice Total</span>
            <span className="text-lg font-semibold">{formatMoney(invoice?.total || 0)}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentAmount">Payment Amount</Label>
            <Input
              id="paymentAmount"
              type="text"
              value={paymentAmountInput}
              onChange={(e) => {
                const sanitized = sanitizeMoneyTyping(e.target.value);
                setPaymentAmountInput(sanitized);
                setPaymentAmount(parseCurrencyInput(sanitized));
              }}
              onBlur={() => {
                setPaymentAmountInput(formatCurrencyInputNoSymbol(paymentAmount));
              }}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="Check">Check</SelectItem>
                <SelectItem value="Card">Card</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Payment Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(paymentDate, "PPP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      );
    }

    if (mode === 'send') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={defaultSubject}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Add a personal message..."
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="relative">
              <div className="absolute inset-x-0 top-0 z-10 flex justify-center">
                <div className="mt-2 px-2 py-0.5 text-xs rounded-md bg-muted text-muted-foreground">
                  Preview
                </div>
              </div>
              <div 
                className="border rounded-md p-4 pt-8 max-h-[60vh] overflow-y-auto text-sm bg-background"
                aria-label="Email preview (non-interactive)"
                dangerouslySetInnerHTML={{ __html: previewHtml || defaultEmailHTML }}
              />
            </div>
          </div>
        </div>
      );
    }

    if (mode === 'edit' || mode === 'create') {
      let initialData: Partial<InvoiceFormData> | undefined;

      try {
        initialData = invoice ? {
          customerId: invoice.customerId || '',
          address: invoice.address || '',
          lineItems: invoice.lineItems || [],
          taxRate: invoice.taxRate || 0,
          discount: invoice.discount || 0,
          paymentTerms: invoice.paymentTerms,
          frequency: invoice.frequency,
          depositRequired: Boolean(invoice.depositRequired),
          depositPercent: invoice.depositPercent || 50,
          notesInternal: invoice.notesInternal || (relatedJob?.notes || ''),
          terms: invoice.terms || '',
          dueDate: invoice.dueAt ? (
            typeof invoice.dueAt === 'string' ? new Date(invoice.dueAt) : invoice.dueAt
          ) : undefined
        } : undefined;
      } catch (error) {
        console.error('Error initializing invoice form data:', error, invoice);
        initialData = undefined;
      }

      return (
        <InvoiceForm
          customers={customers}
          onSubmit={handleSave}
          onCancel={() => onOpenChange(false)}
          initialData={initialData}
          mode={mode}
          loading={loading}
          businessTaxRateDefault={business?.taxRateDefault}
        />
      );
    }

    // View mode
    if (!invoice) {
      return <div className="text-sm text-muted-foreground">No invoice selected.</div>;
    }

    return (
      <div className="space-y-6">
        {/* Customer Information */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Customer Information</h3>
          <div className="bg-muted/30 rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{customerName}</span>
            </div>
            {customerEmail && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span>{customerEmail}</span>
              </div>
            )}
            {invoice.address && (
              <div className="flex items-start justify-between text-sm">
                <span className="text-muted-foreground">Address</span>
                <span className="text-right">{invoice.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        {invoice.lineItems && invoice.lineItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Line Items</h3>
            <div className="border rounded-md">
              <div className="grid grid-cols-12 gap-2 p-3 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
                <div className="col-span-6">Description</div>
                <div className="col-span-2 text-right">Qty</div>
                <div className="col-span-2 text-right">Rate</div>
                <div className="col-span-2 text-right">Amount</div>
              </div>
              {invoice.lineItems.map((item: any, index: number) => (
                <div key={item.id || index} className="grid grid-cols-12 gap-2 p-3 text-sm border-b last:border-b-0">
                  <div className="col-span-6">{item.name}</div>
                  <div className="col-span-2 text-right">{item.qty}</div>
                  <div className="col-span-2 text-right">{formatMoney(item.unitPrice)}</div>
                  <div className="col-span-2 text-right font-medium">{formatMoney(item.lineTotal)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing Summary */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Pricing</h3>
          <div className="bg-muted/30 rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatMoney(invoice.subtotal)}</span>
            </div>
            
            {invoice.taxRate > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tax ({(invoice.taxRate * 100).toFixed(1)}%)</span>
                <span>{formatMoney(Math.round(invoice.subtotal * invoice.taxRate))}</span>
              </div>
            )}
            
            {invoice.discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatMoney(invoice.discount)}</span>
              </div>
            )}

            {invoice.depositRequired && invoice.depositPercent && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Deposit ({invoice.depositPercent}%)</span>
                <span>{formatMoney(Math.round(invoice.total * invoice.depositPercent / 100))}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-lg font-semibold pt-2 border-t">
              <span>Total</span>
              <span>{formatMoney(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Terms & Details */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Invoice Details</h3>
          <div className="bg-muted/30 rounded-md p-3 space-y-2">
            {invoice.createdAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Issued Date</span>
                <span>{formatDate(invoice.createdAt)}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Due Date</span>
              <span>{invoice.dueAt ? formatDate(invoice.dueAt) : 'Not set'}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Payment Terms</span>
              <span>{invoice.paymentTerms ? invoice.paymentTerms.replace(/_/g, ' ') : 'None'}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Frequency</span>
              <span>{invoice.frequency ? invoice.frequency.replace(/_/g, ' ') : 'None'}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Deposit Required</span>
              <span>{invoice.depositRequired ? `Yes (${invoice.depositPercent || 0}%)` : 'No'}</span>
            </div>

            {invoice.status === 'Paid' && invoice.paidAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paid Date</span>
                <span>{formatDate(invoice.paidAt)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Work Order */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Related Work Order</h3>
          <div className="bg-muted/30 rounded-md p-3">
            {relatedJob ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{relatedJob.title || 'Work Order'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => setShowJobModal(true)}
                  >
                    View Details
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={handleUnlinkJob}
                  >
                    Unlink
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">No work order linked</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setShowJobPicker(true)}
                >
                  <Briefcase className="w-3 h-3 mr-1" />
                  Link Work Order
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Quote */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Related Quote</h3>
          <div className="bg-muted/30 rounded-md p-3">
            {relatedQuote ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{relatedQuote.number}</span>
                  <Badge variant="outline" className="text-xs">
                    {relatedQuote.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{formatMoney(relatedQuote.total)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => {
                      onOpenChange(false);
                      window.location.href = `/quotes?highlight=${relatedQuote.id}`;
                    }}
                  >
                    View Quote
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={handleUnlinkQuote}
                  >
                    Unlink
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">No quote linked</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  onClick={() => setShowQuotePicker(true)}
                >
                  <DollarSign className="w-3 h-3 mr-1" />
                  Link Quote
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Notes & Terms</h3>
          <div className="bg-muted/30 rounded-md p-3 space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Internal Notes</div>
              <div className="text-sm whitespace-pre-wrap">{invoice.notesInternal || relatedJob?.notes || 'None'}</div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground mb-1">Terms & Conditions</div>
              <div className="text-sm whitespace-pre-wrap">{invoice.terms || 'None'}</div>
            </div>
          </div>
        </div>

        {/* Payment Information Section */}
        {payments.length > 0 && (
          <div className="pt-2 border-t">
            <div className="text-sm font-medium mb-2">Payment Details</div>
            {payments.map((payment, index) => (
              <div key={payment.id} className="bg-muted/30 rounded-md p-3 mb-2 last:mb-0">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Payment {index + 1}</span>
                  <span className="font-medium">{formatMoney(payment.amount)}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Method</span>
                  <span>{payment.method}{payment.last4 ? ` ****${payment.last4}` : ''}</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Date</span>
                  <span>{formatDate(payment.receivedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderActions = () => {
    if (mode === 'mark_paid') {
      return (
        <div className={isMobile ? "flex flex-col gap-2" : "flex gap-2"}>
          <Button 
            variant="outline" 
            onClick={() => setMode('view')}
            className={isMobile ? "w-full" : ""}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRecordPayment} 
            disabled={loading || paymentAmount <= 0}
            className={isMobile ? "w-full" : ""}
          >
            {loading ? 'Recording...' : 'Record Payment'}
          </Button>
        </div>
      );
    }

    if (mode === 'send') {
      return (
        <div className={isMobile ? "flex flex-col gap-2" : "flex gap-2"}>
          <Button 
            variant="outline" 
            onClick={() => setMode('view')}
            className={isMobile ? "w-full" : ""}
          >
            Back
          </Button>
          <Button 
            onClick={handleSendEmail} 
            disabled={loading || !to.trim()}
            className={isMobile ? "w-full" : ""}
          >
            {loading ? 'Sending...' : 'Send Email'}
          </Button>
        </div>
      );
    }

    if (mode === 'edit' || mode === 'create') {
      // Form submission is handled by InvoiceForm component itself
      return null;
    }

    // View mode actions
    if (!invoice) {
      return null;
    }

    const canMarkAsPaid = invoice.status !== 'Paid';
    const canDelete = invoice.status === 'Draft'; // Only allow deleting draft invoices

    if (isMobile) {
      return (
        <div className="flex flex-col gap-2">
          {/* Secondary actions first */}
          {canMarkAsPaid && (
            <Button variant="outline" onClick={() => setMode('mark_paid')} className="w-full">
              Mark as Paid
            </Button>
          )}

          <Button variant="outline" onClick={() => setMode('send')} className="w-full">
            Email Preview
          </Button>
          
          {/* Edit action before destructive action */}
          <Button variant="default" onClick={() => setMode('edit')} className="w-full">
            Edit Invoice
          </Button>

          {/* Destructive action last */}
          {canDelete && (
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
              className="w-full"
            >
              {t('common.delete')}
            </Button>
          )}
        </div>
      );
    }

    return (
      <>
        {/* Left group - Mark as Paid and Email Preview */}
        <div className="flex gap-2">
          {canMarkAsPaid && (
            <Button variant="outline" onClick={() => setMode('mark_paid')}>
              Mark as Paid
            </Button>
          )}

          <Button variant="outline" onClick={() => setMode('send')}>
            Email Preview
          </Button>
        </div>

        {/* Right group - Edit and Delete */}
        <div className="flex gap-2">
          <Button variant="default" onClick={() => setMode('edit')}>
            Edit Invoice
          </Button>

          {canDelete && (
            <Button 
              variant="destructive" 
              onClick={() => setShowDeleteDialog(true)}
            >
              {t('common.delete')}
            </Button>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh] flex flex-col">
          <DrawerHeader>
            <DrawerTitle>{getModalTitle()}</DrawerTitle>
            <DrawerDescription>{getModalDescription()}</DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 space-y-4 overflow-y-auto flex-1">
            {renderContent()}
          </div>
          
          <DrawerFooter>
            {isMobile ? (
              <div className="flex flex-col">
                {renderActions()}
              </div>
            ) : (
              <div className="flex justify-between">
                {renderActions()}
              </div>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('invoices.delete.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('invoices.delete.confirmDescription', { number: invoice?.number })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteInvoice.isPending}
            >
              {deleteInvoice.isPending ? t('invoices.delete.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Job Show Modal */}
      {relatedJob && (
        <JobShowModal
          job={relatedJob}
          open={showJobModal}
          onOpenChange={setShowJobModal}
        />
      )}

      {/* Pick Job Modal */}
      <PickJobModal
        open={showJobPicker}
        onOpenChange={setShowJobPicker}
        onSelect={handleLinkJob}
        customerId={invoice?.customerId}
      />

      {/* Pick Quote Modal */}
      <PickQuoteModal
        open={showQuotePicker}
        onOpenChange={setShowQuotePicker}
        onSelect={handleLinkQuote}
        customerId={invoice?.customerId}
      />
    </>
  );
}