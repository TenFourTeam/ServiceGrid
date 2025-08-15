import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { formatDate, formatMoney } from '@/utils/format';
import { useCustomersData } from '@/queries/unified';
import type { Invoice } from '@/types';

export default function InvoiceEditor({ open, onOpenChange, invoice }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
}) {
  const { data: customers = [] } = useCustomersData();
  const customerName = invoice ? (customers.find(c => c.id === invoice.customerId)?.name || 'Unknown') : '';

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
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-lg font-semibold">{formatMoney(invoice.total)}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                Editing coming soon. For now, you can mark status from the list.
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No invoice selected.</div>
          )}
        </div>
        <DrawerFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
