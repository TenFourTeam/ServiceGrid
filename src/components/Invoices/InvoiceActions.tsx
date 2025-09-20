import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, DollarSign, Send } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Invoice } from '@/types';

interface InvoiceActionsProps {
  invoice: Invoice;
  onEditInvoice: (invoice: Invoice) => void;
  onMarkAsPaid: (invoice: Invoice) => void;
  onEmailPreview: (invoice: Invoice) => void;
}

export function InvoiceActions({ 
  invoice, 
  onEditInvoice, 
  onMarkAsPaid, 
  onEmailPreview 
}: InvoiceActionsProps) {
  const { t } = useLanguage();

  const canMarkAsPaid = invoice.status !== 'Paid';
  const canEdit = invoice.status === 'Draft';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background border shadow-md">
        <DropdownMenuItem onClick={() => onEmailPreview(invoice)} className="gap-2">
          <Send className="h-4 w-4" />
          Email Preview
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {canEdit && (
          <DropdownMenuItem onClick={() => onEditInvoice(invoice)} className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Invoice
          </DropdownMenuItem>
        )}
        {canMarkAsPaid && (
          <DropdownMenuItem onClick={() => onMarkAsPaid(invoice)} className="gap-2">
            <DollarSign className="h-4 w-4" />
            Mark as Paid
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}