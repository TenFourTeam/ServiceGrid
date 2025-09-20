import { useEffect, useMemo, useState } from 'react';
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { formatMoney, formatDate } from '@/utils/format';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useCustomersData } from '@/queries/unified';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/queries/keys';
import LoadingScreen from '@/components/LoadingScreen';
import { QuoteForm } from '@/components/Quotes/QuoteForm';
import { useLifecycleEmailIntegration } from '@/hooks/useLifecycleEmailIntegration';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDeleteQuote } from '@/hooks/useQuoteOperations';
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
  const { t } = useLanguage();
  const { data: customers = [] } = useCustomersData();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const { triggerQuoteCreated } = useLifecycleEmailIntegration();
  const deleteQuoteMutation = useDeleteQuote();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentMode, setCurrentMode] = useState<'create' | 'view' | 'edit'>(mode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConvertingToJob, setIsConvertingToJob] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
        const { data: fullQuote, error } = await authApi.invoke(`quotes-crud?id=${quoteId}`, {
          method: 'GET'
        });
        
        if (error) {
          throw new Error(error.message || 'Failed to fetch quote');
        }
        
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
        const { data: result, error } = await authApi.invoke('quotes-crud', {
          method: 'POST',
          body: {
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
          },
          toast: {
            success: 'Quote created successfully',
            loading: 'Creating quote...',
            error: 'Failed to create quote'
          }
        });
        
        if (error) {
          throw new Error(error.message || 'Failed to create quote');
        }

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
        
        // Trigger lifecycle email for first quote
        try {
          triggerQuoteCreated();
        } catch (error) {
          console.error('[QuoteDetailsModal] Failed to trigger quote milestone email:', error);
        }
      } else if (currentMode === 'edit' && quote) {
        console.log('[QuoteDetailsModal] Updating quote:', quote.id);
        const { data: result, error } = await authApi.invoke('quotes-crud', {
          method: 'PUT',
          body: {
            id: quote.id,
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
          },
          toast: {
            success: 'Quote updated successfully',
            loading: 'Updating quote...',
            error: 'Failed to update quote'
          }
        });
        
        if (error) {
          throw new Error(error.message || 'Failed to update quote');
        }

        // Refresh quote data
        if (businessId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.data.quotes(businessId) });
        }

        setQuote(result.quote);
        setCurrentMode('view');
      }
    } catch (e: any) {
      console.error(e);
      // Error already handled by authApi toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertToJob = async () => {
    if (!quote) return;
    
    if (quote.status === 'Draft') {
      toast.error(t('quotes.messages.cannotConvertDraft'));
      return;
    }

    setIsConvertingToJob(true);

    try {
      const { data: result } = await authApi.invoke('jobs', {
        method: 'POST',
        body: {
          quoteId: quote.id,
          customerId: quote.customerId,
          title: `Job from Quote ${quote.number}`,
          total: quote.total,
          status: 'Scheduled',
        },
        toast: {
          success: 'Quote converted to job successfully',
          loading: 'Converting quote to job...',
          error: 'Failed to convert quote to job'
        }
      });

      if (result) {
        onOpenChange(false);
        navigate('/calendar');
      }
    } catch (error) {
      console.error('Failed to convert quote to job:', error);
    } finally {
      setIsConvertingToJob(false);
    }
  };

  const handleCreateInvoice = async () => {
    if (!quote) return;

    if (quote.status === 'Draft') {
      toast.error(t('quotes.messages.cannotCreateInvoiceDraft'));
      return;
    }

    setIsCreatingInvoice(true);

    try {
      const { data: result } = await authApi.invoke('invoices-crud', {
        method: 'POST',
        body: {
          quoteId: quote.id,
          customerId: quote.customerId,
          status: 'Draft',
          total: quote.total,
        },
        toast: {
          success: `Invoice created from quote ${quote.number} successfully`,
          loading: 'Creating invoice...',
          error: 'Failed to create invoice'
        }
      });

      // Optimistic update - add invoice to cache immediately
      if (result?.invoice && businessId) {
        queryClient.setQueryData(queryKeys.data.invoices(businessId), (oldData: any) => {
          if (oldData) {
            return {
              ...oldData,
              invoices: [result.invoice, ...oldData.invoices],
              count: oldData.count + 1
            };
          }
          return { invoices: [result.invoice], count: 1 };
        });
      }

      if (result) {
        onOpenChange(false);
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Failed to create invoice from quote:', error);
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handleDeleteQuote = async () => {
    if (!quote) return;
    
    try {
      await deleteQuoteMutation.mutateAsync(quote.id);
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to delete quote:', error);
    }
  };

  const getModalTitle = () => {
    if (currentMode === 'create') return t('quotes.modal.create');
    if (currentMode === 'edit') return `${t('quotes.modal.edit')} ${quote?.number || ''}`;
    return `${t('quotes.modal.quote')} ${quote?.number || ''}`;
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
                {t(`quotes.status.${quote.status.toLowerCase().replace(/\s+/g, '')}`)}
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
                <div className="text-sm text-muted-foreground">{t('quotes.modal.customer')}</div>
                <div className="font-medium">{customerName}</div>
                {customerEmail && (
                  <div className="text-sm text-muted-foreground">{customerEmail}</div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('quotes.modal.total')}</div>
                <div className="font-medium text-lg">{formatMoney(quote.total)}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">{t('quotes.modal.created')}</div>
                <div>{formatDate(quote.createdAt)}</div>
              </div>
              {quote.sentAt && (
                <div>
                  <div className="text-sm text-muted-foreground">{t('quotes.modal.sent')}</div>
                  <div>{formatDate(quote.sentAt)}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {currentMode === 'view' && (
          <DrawerFooter>
            <div className="flex justify-between">
              {quote && (
                <>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => onSendQuote?.(quote)}
                    >
                      {quote.sentAt || quote.status !== 'Draft' ? t('quotes.actions.resendQuote') : t('quotes.actions.sendQuote')}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleConvertToJob}
                      disabled={isConvertingToJob}
                    >
                      {isConvertingToJob ? t('quotes.messages.convertingToJob') : t('quotes.actions.convertToJob')}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleCreateInvoice}
                      disabled={isCreatingInvoice}
                    >
                      {isCreatingInvoice ? t('quotes.messages.creatingInvoice') : t('quotes.actions.createInvoice')}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="default" 
                      onClick={() => setCurrentMode('edit')}
                    >
                      {t('quotes.actions.editQuote')}
                    </Button>
                    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive">
                          {t('quotes.actions.deleteQuote')}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>{t('quotes.delete.confirmTitle')}</AlertDialogTitle>
                          <AlertDialogDescription>
                            {t('quotes.delete.confirmDescription', { number: quote.number })}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDeleteQuote}
                            disabled={deleteQuoteMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteQuoteMutation.isPending ? t('quotes.delete.deleting') : t('common.delete')}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </>
              )}
            </div>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}