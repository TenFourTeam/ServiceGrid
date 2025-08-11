import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { formatDate, formatMoney } from '@/utils/format';
import { useStore } from '@/store/useAppStore';
import type { Invoice } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InvoiceShowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}

export default function InvoiceShowModal({ open, onOpenChange, invoice }: InvoiceShowModalProps) {
  const { customers, sendInvoice, markInvoicePaid } = useStore();
  const customerName = invoice ? (customers.find(c => c.id === invoice.customerId)?.name || 'Unknown') : '';

  const handlePayOnline = async () => {
    try {
      if (!invoice) return;
      const { data, error } = await supabase.functions.invoke('create-invoice-payment', {
        body: { invoiceId: invoice.id },
      });
      const url = (data as any)?.url as string | undefined;
      if (error || !url) {
        toast.error(error?.message || 'Failed to start checkout');
        return;
      }
      window.open(url, '_blank');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to start checkout');
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Invoice {invoice?.number ?? ''}</DrawerTitle>
          <DrawerDescription>
            {invoice ? `${customerName} • ${invoice.status}${invoice.dueAt ? ` • Due ${formatDate(invoice.dueAt)}` : ''}` : ''}
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-4 grid gap-3">
          {invoice ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="text-sm">{formatMoney(invoice.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tax ({Math.round(invoice.taxRate*100)}%)</span>
                <span className="text-sm">{formatMoney(Math.round(invoice.subtotal * invoice.taxRate))}</span>
              </div>
              {invoice.discount ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Discount</span>
                  <span className="text-sm">-{formatMoney(invoice.discount)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t pt-2">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-semibold">{formatMoney(invoice.total)}</span>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No invoice selected.</div>
          )}
        </div>
        <DrawerFooter>
          {invoice && (
            <div className="flex items-center gap-2">
              {invoice.status === 'Draft' && (
                <Button size="sm" onClick={() => sendInvoice(invoice.id)}>Mark Sent</Button>
              )}
              {(invoice.status === 'Sent' || invoice.status === 'Overdue') && (
                <>
                  <Button size="sm" variant="secondary" onClick={handlePayOnline}>Pay Online</Button>
                  {invoice.status === 'Sent' && (
                    <Button size="sm" onClick={() => markInvoicePaid(invoice.id, '4242')}>Mark Paid</Button>
                  )}
                </>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </div>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
