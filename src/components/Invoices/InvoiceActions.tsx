import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MoreHorizontal, Edit, DollarSign, Send, Trash2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDeleteInvoice } from '@/hooks/useInvoiceOperations';
import type { Invoice } from '@/types';
import { useState } from 'react';

interface InvoiceActionsProps {
  invoice: Invoice;
  onEditInvoice: (invoice: Invoice) => void;
  onMarkAsPaid: (invoice: Invoice) => void;
  onEmailPreview: (invoice: Invoice) => void;
  onInvoiceDeleted?: () => void;
}

export function InvoiceActions({ 
  invoice, 
  onEditInvoice, 
  onMarkAsPaid, 
  onEmailPreview,
  onInvoiceDeleted
}: InvoiceActionsProps) {
  const { t } = useLanguage();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const deleteInvoice = useDeleteInvoice();

  const canMarkAsPaid = invoice.status !== 'Paid';
  const canEdit = invoice.status === 'Draft';
  const canDelete = invoice.status === 'Draft'; // Only allow deleting draft invoices

  const handleDelete = async () => {
    try {
      await deleteInvoice.mutateAsync(invoice.id);
      setShowDeleteDialog(false);
      onInvoiceDeleted?.();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="bg-background border shadow-md">
          <DropdownMenuItem onClick={() => onEmailPreview(invoice)} className="gap-2">
            <Send className="h-4 w-4" />
            Send Email
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
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setShowDeleteDialog(true)} 
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                {t('invoices.actions.deleteInvoice')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('invoices.delete.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('invoices.delete.confirmDescription', { number: invoice.number })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteInvoice.isPending}
            >
              {deleteInvoice.isPending ? t('invoices.delete.deleting') : t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}