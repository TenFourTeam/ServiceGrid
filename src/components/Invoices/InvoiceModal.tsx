import { useState, useEffect, useMemo } from 'react';
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Send, Eye, Edit3, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatDate, formatMoney } from '@/utils/format';
import { useCustomersData } from '@/queries/unified';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { invalidationHelpers } from '@/queries/keys';
import { generateInvoiceEmail } from '@/utils/emailTemplateEngine';
import { escapeHtml } from '@/utils/sanitize';
import type { Invoice } from '@/types';

export interface InvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  mode?: 'view' | 'edit' | 'send' | 'create';
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
  const { data: customers = [] } = useCustomersData();
  const { business, businessName, businessLogoUrl, businessLightLogoUrl, businessId } = useBusinessContext();
  const { getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryClient = useQueryClient();

  const [mode, setMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  
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

  const customerName = useMemo(() => {
    const customer = customers.find(c => c.id === (invoice?.customerId || customerId));
    return customer?.name || 'Unknown';
  }, [customers, invoice?.customerId, customerId]);

  const customerEmail = useMemo(() => {
    const customer = customers.find(c => c.id === (invoice?.customerId || customerId));
    return customer?.email || '';
  }, [customers, invoice?.customerId, customerId]);

  // Email templates
  const defaultEmailHTML = useMemo(() => {
    if (!invoice) return '';
    const { html } = generateInvoiceEmail({
      businessName,
      businessLogoUrl,
      invoice
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

  // Reset form when modal opens/closes or invoice changes
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
    } else if (open && !invoice && initialCustomerId) {
      setCustomerId(initialCustomerId);
      setStatus('Draft');
      setDueDate(undefined);
      setTaxRate(business?.taxRateDefault || 0);
      setDiscount(0);
      setTo('');
      setSubject('');
      setMessage('');
    }
    setMode(initialMode);
  }, [open, invoice, initialCustomerId, initialMode, customerEmail, defaultSubject, business?.taxRateDefault]);

  const handleSave = async () => {
    if (!businessId) return;
    
    setLoading(true);
    try {
      const data = {
        customerId,
        status,
        dueAt: dueDate?.toISOString(),
        taxRate,
        discount,
      };

      if (invoice) {
        // Update existing invoice
        await authApi.invoke('invoices', {
          method: 'PATCH',
          body: { id: invoice.id, ...data },
          toast: {
            success: `Invoice ${invoice.number} updated successfully`,
            loading: 'Updating invoice...',
            error: 'Failed to update invoice'
          }
        });
      } else {
        // Create new invoice
        await authApi.invoke('invoices', {
          method: 'POST',
          body: data,
          toast: {
            success: 'Invoice created successfully',
            loading: 'Creating invoice...',
            error: 'Failed to create invoice'
          }
        });
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
      const finalHtml = message.trim() ? previewHtml : defaultEmailHTML;

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
      const token = await getToken({ template: 'supabase' });
      
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

  const handleMarkSent = async () => {
    if (!invoice || !businessId) return;

    try {
      await authApi.invoke('invoices', {
        method: 'PATCH',
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

  const getModalTitle = () => {
    if (!invoice && mode === 'create') return 'Create Invoice';
    if (!invoice) return 'Invoice';
    
    switch (mode) {
      case 'send': return `Send Invoice ${invoice.number}`;
      case 'edit': return `Edit Invoice ${invoice.number}`;
      default: return `Invoice ${invoice.number}`;
    }
  };

  const getModalDescription = () => {
    if (mode === 'send') return `Send invoice to ${customerName}`;
    if (!invoice) return 'Create a new invoice';
    return `${customerName} • ${invoice.status}${invoice.dueAt ? ` • Due ${formatDate(invoice.dueAt)}` : ''}`;
  };

  const renderContent = () => {
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
            <div 
              className="border rounded-md p-3 max-h-40 overflow-y-auto text-sm bg-muted/30"
              dangerouslySetInnerHTML={{ __html: previewHtml || defaultEmailHTML }}
            />
          </div>
        </div>
      );
    }

    if (mode === 'edit' || mode === 'create') {
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Customer</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select customer..." />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taxRate">Tax Rate (%)</Label>
              <Input
                id="taxRate"
                type="number"
                value={taxRate}
                onChange={(e) => setTaxRate(Number(e.target.value))}
                step="0.01"
                min="0"
                max="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount">Discount ($)</Label>
              <Input
                id="discount"
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                step="0.01"
                min="0"
              />
            </div>
          </div>
        </div>
      );
    }

    // View mode
    if (!invoice) {
      return <div className="text-sm text-muted-foreground">No invoice selected.</div>;
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-lg font-semibold">{formatMoney(invoice.total)}</span>
        </div>
        
        {invoice.subtotal !== invoice.total && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span>{formatMoney(invoice.subtotal)}</span>
            </div>
            
            {invoice.taxRate > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tax ({invoice.taxRate}%)</span>
                <span>{formatMoney(Math.round(invoice.subtotal * invoice.taxRate / 100))}</span>
              </div>
            )}
            
            {invoice.discount > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Discount</span>
                <span>-{formatMoney(invoice.discount)}</span>
              </div>
            )}
          </>
        )}

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Customer</span>
            <span>{customerName}</span>
          </div>
          
          {invoice.dueAt && (
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Due Date</span>
              <span>{formatDate(invoice.dueAt)}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderActions = () => {
    if (mode === 'send') {
      return (
        <>
          <Button variant="outline" onClick={() => setMode('view')}>
            Back
          </Button>
          <Button 
            onClick={handleSendEmail} 
            disabled={loading || !to.trim()}
          >
            {loading ? 'Sending...' : 'Send Email'}
          </Button>
        </>
      );
    }

    if (mode === 'edit' || mode === 'create') {
      return (
        <>
          <Button variant="outline" onClick={() => mode === 'create' ? onOpenChange(false) : setMode('view')}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !customerId}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </>
      );
    }

    // View mode actions
    if (!invoice) {
      return (
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      );
    }

    return (
      <>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
        
        <Button variant="outline" onClick={() => setMode('edit')}>
          <Edit3 className="h-4 w-4 mr-2" />
          Edit
        </Button>

        {invoice.status === 'Draft' && (
          <>
            <Button variant="outline" onClick={handleMarkSent}>
              <Eye className="h-4 w-4 mr-2" />
              Mark Sent
            </Button>
            
            <Button onClick={() => setMode('send')}>
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </>
        )}

        {(invoice.status === 'Sent' || invoice.status === 'Overdue') && (
          <Button onClick={handlePayOnline} disabled={loading}>
            <CreditCard className="h-4 w-4 mr-2" />
            {loading ? 'Loading...' : 'Pay Online'}
          </Button>
        )}
      </>
    );
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl mx-auto">
        <DrawerHeader>
          <DrawerTitle>{getModalTitle()}</DrawerTitle>
          <DrawerDescription>{getModalDescription()}</DrawerDescription>
        </DrawerHeader>
        
        <div className="px-4 pb-4">
          {renderContent()}
        </div>
        
        <DrawerFooter>
          {renderActions()}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}