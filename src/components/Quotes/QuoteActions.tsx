import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Send, FileText, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useLifecycleEmailIntegration } from '@/hooks/useLifecycleEmailIntegration';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/queries/keys';
import { useLanguage } from '@/contexts/LanguageContext';
import type { QuoteListItem } from '@/types';

interface QuoteActionsProps {
  quote: QuoteListItem;
  onSendQuote: (quote: QuoteListItem) => void;
}

export function QuoteActions({ quote, onSendQuote }: QuoteActionsProps) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { getToken } = useClerkAuth();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const { triggerJobScheduled, triggerInvoiceSent } = useLifecycleEmailIntegration();


  const handleConvertToJob = async () => {
    if (quote.status === 'Draft') {
      toast.error(t('quotes.messages.cannotConvertDraft'));
      return;
    }

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
          success: `Quote ${quote.number} converted to job successfully`,
          loading: 'Converting quote to job...',
          error: 'Failed to convert quote to job',
          onSuccess: triggerJobScheduled
        }
      });

      if (result) {
        navigate('/calendar');
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
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Failed to create invoice from quote:', error);
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
        <DropdownMenuItem onClick={() => onSendQuote(quote)} className="gap-2">
          <Send className="h-4 w-4" />
          {t('quotes.actions.sendQuote')}
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}