import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Send, Link } from 'lucide-react';
import { toast } from 'sonner';
import type { QuoteListItem } from '@/types';
import { QuoteConversions } from './QuoteConversions';

interface QuoteActionsProps {
  quote: QuoteListItem;
  onSendQuote: (quote: QuoteListItem) => void;
}

export function QuoteActions({ quote, onSendQuote }: QuoteActionsProps) {
  function copyPublicLink() {
    const url = `${window.location.origin}/quote/${quote.publicToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Quote link copied to clipboard');
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onSendQuote(quote)}
        className="gap-1"
      >
        <Send className="h-3 w-3" />
        Send
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={copyPublicLink} className="gap-2">
            <Link className="h-4 w-4" />
            Copy Public Link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </DropdownMenuContent>
      </DropdownMenu>

      <QuoteConversions quote={quote} />
    </div>
  );
}