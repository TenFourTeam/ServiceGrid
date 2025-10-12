import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Send, FileText, Receipt, Edit, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useLifecycleEmailIntegration } from '@/hooks/useLifecycleEmailIntegration';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys, invalidationHelpers } from '@/queries/keys';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDeleteQuote } from '@/hooks/useQuoteOperations';
import type { QuoteListItem, InvoicesCacheData, Job } from '@/types';
import { useState } from 'react';

interface QuoteActionsProps {
  quote: QuoteListItem;
  onSendQuote: (quote: QuoteListItem) => void;
  onEditQuote: (quote: QuoteListItem) => void;
}

export function QuoteActions({ quote, onSendQuote, onEditQuote }: QuoteActionsProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();
  const authApi = useAuthApi();
  const { triggerJobScheduled, triggerInvoiceSent } = useLifecycleEmailIntegration();
  const deleteQuoteMutation = useDeleteQuote();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Determine if quote has been sent (show "Re-send" vs "Send")
  const hasBeenSent = quote.sentAt != null || quote.status !== 'Draft';

  const handleConvertToJob = async () => {
    if (quote.status === 'Draft') {
      toast.error(t('quotes.messages.cannotConvertDraft'));
      return;
    }

    try {
      const { data: result } = await authApi.invoke('jobs-crud', {
        method: 'POST',
        body: {
          quoteId: quote.id,
          customerId: quote.customerId,
          title: `Job from Quote ${quote.number}`,
          status: 'Scheduled',
        },
        toast: {
          success: `Quote ${quote.number} converted to job successfully`,
          loading: 'Converting quote to job...',
          error: 'Failed to convert quote to job',
          onSuccess: triggerJobScheduled
        }
      });

      // Optimistically update the jobs cache with the new job
      if (result?.job && businessId) {
        queryClient.setQueryData(
          queryKeys.data.jobs(businessId), 
          (oldData: { jobs: Job[], count: number } | undefined) => {
            if (oldData) {
              return {
                jobs: [result.job, ...oldData.jobs],
                count: oldData.count + 1
              };
            }
            return { jobs: [result.job], count: 1 };
          }
        );
        
        // Also invalidate to ensure data stays fresh
        invalidationHelpers.jobs(queryClient, businessId);
      }

      if (result) {
        navigate('/work-orders');
      }
    } catch (error) {
      console.error('Failed to convert quote to job:', error);
    }
  };

  const handleCreateInvoice = async () => {
    if (quote.status === 'Draft') {
      toast.error(t('quotes.messages.cannotCreateInvoiceDraft'));
      return;
    }

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
          error: 'Failed to create invoice',
          onSuccess: triggerInvoiceSent
        }
      });

      // Optimistic update - add invoice to cache immediately
      if (result?.invoice && businessId) {
        queryClient.setQueryData(queryKeys.data.invoices(businessId), (oldData: InvoicesCacheData | undefined) => {
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
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Failed to create invoice from quote:', error);
    }
  };

  const handleDeleteQuote = async () => {
    try {
      await deleteQuoteMutation.mutateAsync(quote.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete quote:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEditQuote(quote)} className="gap-2">
          <Edit className="h-4 w-4" />
          {t('quotes.actions.editQuote')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSendQuote(quote)} className="gap-2">
          <Send className="h-4 w-4" />
          {hasBeenSent ? t('quotes.actions.resendQuote') : t('quotes.actions.sendQuote')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleConvertToJob} className="gap-2">
          <FileText className="h-4 w-4" />
          {t('quotes.actions.convertToJob')}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCreateInvoice} className="gap-2">
          <Receipt className="h-4 w-4" />
          {t('quotes.actions.createInvoice')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem 
              onSelect={(e) => {
                e.preventDefault();
                setShowDeleteDialog(true);
              }}
              className="gap-2 text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              {t('quotes.actions.deleteQuote')}
            </DropdownMenuItem>
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}