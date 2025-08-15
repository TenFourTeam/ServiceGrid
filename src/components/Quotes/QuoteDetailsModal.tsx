import { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatMoney, formatDate } from '@/utils/format';
import { edgeRequest } from '@/utils/edgeApi';
import { edgeToast } from '@/utils/edgeRequestWithToast';
import { fn } from '@/utils/functionUrl';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useCustomersData } from '@/queries/unified';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/queries/keys';
import LoadingScreen from '@/components/LoadingScreen';
import { QuoteForm } from '@/components/Quotes/QuoteForm';
import type { Quote, QuoteListItem, QuoteStatus, Customer } from '@/types';

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
  onSendQuote?: (quote: Quote) => void;
  mode?: 'create' | 'view' | 'edit';
  defaultTaxRate?: number;
}

export function QuoteDetailsModal({ open, onOpenChange, quoteId, onSendQuote, mode = 'view', defaultTaxRate = 0.1 }: QuoteDetailsModalProps) {
  const { data: customers = [] } = useCustomersData();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<'create' | 'view' | 'edit'>(mode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConvertingToJob, setIsConvertingToJob] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

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
    setCurrentMode(mode);
    
    if (!open) {
      setQuote(null);
      return;
    }

    if (mode === 'create') {
      setQuote(null);
      return;
    }

    if (!quoteId) {
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
  }, [open, quoteId, onOpenChange, mode]);

  const handleSubmit = async (formData: any) => {
    setIsSubmitting(true);
    try {
      if (currentMode === 'create') {
        const result = await edgeRequest(fn('quotes'), {
          method: 'POST',
          body: JSON.stringify({
            customerId: formData.customerId,
            address: formData.address,
            lineItems: formData.lineItems.map((li: any) => ({
              name: li.name,
              qty: li.qty,
              unit: li.unit || null,
              unitPrice: li.unitPrice,
              lineTotal: li.lineTotal,
            })),
            taxRate: formData.taxRate,
            discount: formData.discount,
            notesInternal: formData.notesInternal || null,
            terms: formData.terms || null,
            paymentTerms: formData.paymentTerms,
            frequency: formData.frequency,
            depositRequired: formData.depositRequired,
            depositPercent: formData.depositPercent,
          }),
        });

        // Invalidate quotes data
        if (businessId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.data.quotes(businessId) });
        }

        const newQuote: Quote = {
          id: result.quote.id,
          number: result.quote.number,
          businessId: businessId || '',
          customerId: formData.customerId,
          address: formData.address,
          lineItems: formData.lineItems,
          taxRate: result.quote.taxRate,
          discount: result.quote.discount,
          subtotal: result.quote.subtotal,
          total: result.quote.total,
          status: result.quote.status,
          files: [],
          notesInternal: formData.notesInternal,
          terms: formData.terms,
          paymentTerms: formData.paymentTerms,
          frequency: formData.frequency,
          depositRequired: formData.depositRequired,
          depositPercent: formData.depositPercent,
          sentAt: undefined,
          viewCount: result.quote.viewCount || 0,
          createdAt: result.quote.createdAt || new Date().toISOString(),
          updatedAt: result.quote.updatedAt || new Date().toISOString(),
          publicToken: result.quote.publicToken,
        };

        onOpenChange(false);
        onSendQuote?.(newQuote);
        toast.success('Quote created successfully');
      } else if (currentMode === 'edit' && quote) {
        console.log('[QuoteDetailsModal] Updating quote:', quote.id);
        const result = await edgeRequest(fn(`quotes/${quote.id}`), {
          method: 'PATCH',
          body: JSON.stringify({
            customerId: formData.customerId,
            address: formData.address,
            lineItems: formData.lineItems.map((li: any) => ({
              name: li.name,
              qty: li.qty,
              unit: li.unit || null,
              unitPrice: li.unitPrice,
              lineTotal: li.lineTotal,
            })),
            taxRate: formData.taxRate,
            discount: formData.discount,
            notesInternal: formData.notesInternal || null,
            terms: formData.terms || null,
            paymentTerms: formData.paymentTerms,
            frequency: formData.frequency,
            depositRequired: formData.depositRequired,
            depositPercent: formData.depositPercent,
          }),
        });

        // Refresh quote data
        if (businessId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.data.quotes(businessId) });
        }

        setQuote(result.quote);
        setCurrentMode('view');
        toast.success('Quote updated successfully');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || `Failed to ${currentMode === 'create' ? 'create' : 'update'} quote`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertToJob = async () => {
    if (!quote) return;
    
    if (quote.status === 'Draft') {
      toast.error('Cannot convert draft quotes to jobs. Send the quote first.');
      return;
    }

    setIsConvertingToJob(true);
    toast.info('Converting quote to job...');

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
    } finally {
      setIsConvertingToJob(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!quote) return;

    if (quote.status === 'Draft') {
      toast.error('Cannot create invoice from draft quotes. Send the quote first.');
      return;
    }

    setIsCreatingInvoice(true);
    toast.info('Creating invoice from quote...');

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
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const getModalTitle = () => {
    if (currentMode === 'create') return 'Create Quote';
    if (currentMode === 'edit') return `Edit Quote ${quote?.number || ''}`;
    return `Quote ${quote?.number || ''}`;
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
            <span>{getModalTitle()}</span>
            {quote && currentMode === 'view' && (
              <Badge className={statusColors[quote.status]}>
                {quote.status}
              </Badge>
            )}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 overflow-y-auto">
          <QuoteForm
            customers={customers}
            defaultTaxRate={defaultTaxRate}
            onSubmit={handleSubmit}
            onCancel={() => {
              if (currentMode === 'edit') {
                setCurrentMode('view');
              } else {
                onOpenChange(false);
              }
            }}
            disabled={isSubmitting}
            initialData={quote || undefined}
            mode={currentMode}
          />

          {currentMode === 'view' && quote && (
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
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
          )}
        </div>

        <DrawerFooter>
          <div className="flex gap-2 justify-end">
            {currentMode === 'view' && quote && (
              <>
                {(quote.status === 'Draft' || quote.status === 'Edits Requested') && (
                  <Button 
                    variant="outline" 
                    onClick={() => setCurrentMode('edit')}
                  >
                    Edit Quote
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => onSendQuote?.(quote)}
                >
                  Send Quote
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleConvertToJob}
                  disabled={isConvertingToJob}
                >
                  {isConvertingToJob ? 'Converting...' : 'Convert to Job'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCreateInvoice}
                  disabled={isCreatingInvoice}
                >
                  {isCreatingInvoice ? 'Creating...' : 'Create Invoice'}
                </Button>
              </>
            )}
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}