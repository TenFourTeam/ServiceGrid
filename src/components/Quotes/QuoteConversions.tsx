import React from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, FileText, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import type { QuoteListItem } from '@/types';

interface QuoteConversionsProps {
  quote: QuoteListItem;
}

export function QuoteConversions({ quote }: QuoteConversionsProps) {
  const navigate = useNavigate();

  const handleConvertToJob = async () => {
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
        navigate('/calendar');
      }
    } catch (error) {
      console.error('Failed to convert quote to job:', error);
      toast.error('Failed to convert quote to job');
    }
  };

  const handleCreateInvoice = async () => {
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
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Failed to create invoice from quote:', error);
      toast.error('Failed to create invoice from quote');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Convert <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
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