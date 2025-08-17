import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Send, FileText, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
// edgeToast removed - migrate to authApi.invoke() pattern
import { fn } from '@/utils/functionUrl';
import { useLifecycleEmailIntegration } from '@/hooks/useLifecycleEmailIntegration';
import type { QuoteListItem } from '@/types';

interface QuoteActionsProps {
  quote: QuoteListItem;
  onSendQuote: (quote: QuoteListItem) => void;
}

export function QuoteActions({ quote, onSendQuote }: QuoteActionsProps) {
  const navigate = useNavigate();
  const { triggerJobScheduled, triggerInvoiceSent } = useLifecycleEmailIntegration();


  const handleConvertToJob = async () => {
    if (quote.status === 'Draft') {
      toast.error('Cannot convert draft quotes to jobs. Send the quote first.');
      return;
    }

    try {
      const result = await edgeToast.create(fn('jobs'), {
        quoteId: quote.id,
        customerId: quote.customerId,
        title: `Job from Quote ${quote.number}`,
        total: quote.total,
        status: 'Scheduled',
      }, `Quote ${quote.number} converted to job successfully`, triggerJobScheduled);

      if (result.ok || result.success) {
        navigate('/calendar');
      }
    } catch (error) {
      console.error('Failed to convert quote to job:', error);
    }
  };

  const handleCreateInvoice = async () => {
    if (quote.status === 'Draft') {
      toast.error('Cannot create invoice from draft quotes. Send the quote first.');
      return;
    }

    try {
      const result = await edgeToast.create(fn('invoices'), {
        quoteId: quote.id,
        customerId: quote.customerId,
        status: 'Draft',
        total: quote.total,
      }, `Invoice created from quote ${quote.number} successfully`, triggerInvoiceSent);

      if (result.ok || result.success) {
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
          Send Quote
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleConvertToJob} className="gap-2">
          <FileText className="h-4 w-4" />
          Convert to Job
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCreateInvoice} className="gap-2">
          <Receipt className="h-4 w-4" />
          Create Invoice
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}