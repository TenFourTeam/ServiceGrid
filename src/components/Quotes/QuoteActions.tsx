import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { MoreHorizontal, Send, Wrench, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import type { QuoteListItem } from '@/types';

interface QuoteActionsProps {
  quote: QuoteListItem;
  onSendQuote: (quote: any) => void; // Will be converted to full Quote in parent
}

export function QuoteActions({ quote, onSendQuote }: QuoteActionsProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const canSend = quote.status === 'Draft';
  const canConvert = quote.status === 'Approved' || quote.status === 'Sent';

  const handleConvertToJob = async () => {
    setIsLoading(true);
    try {
      await edgeRequest(fn('jobs'), {
        method: 'POST',
        body: JSON.stringify({ quoteId: quote.id }),
      });
      toast.success('Quote converted to work order');
      navigate('/work-orders');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to convert quote');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvoice = async () => {
    setIsLoading(true);
    try {
      await edgeRequest(fn('invoices'), {
        method: 'POST',
        body: JSON.stringify({ quoteId: quote.id }),
      });
      toast.success('Invoice created successfully');
      navigate('/invoices');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create invoice');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex gap-1">
      {canSend && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSendQuote(quote)}
              disabled={isLoading}
            >
              <Send className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Send Quote</TooltipContent>
        </Tooltip>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" disabled={isLoading}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canConvert && (
            <>
              <DropdownMenuItem onClick={handleConvertToJob}>
                <Wrench className="h-4 w-4 mr-2" />
                Convert to Work Order
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCreateInvoice}>
                <Receipt className="h-4 w-4 mr-2" />
                Create Invoice
              </DropdownMenuItem>
            </>
          )}
          {quote.status === 'Draft' && (
            <DropdownMenuItem onClick={() => onSendQuote(quote)}>
              <Send className="h-4 w-4 mr-2" />
              Send Quote
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}