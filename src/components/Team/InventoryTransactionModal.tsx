import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from '@/components/ui/drawer';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-mobile';
import type { InventoryItem } from '@/hooks/useInventory';

const formSchema = z.object({
  quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface InventoryTransactionModalProps {
  item: InventoryItem;
  type: 'usage' | 'restock';
  open: boolean;
  onClose: () => void;
  onSave: (quantity: number, notes?: string) => void;
}

export function InventoryTransactionModal({ 
  item, 
  type, 
  open, 
  onClose, 
  onSave 
}: InventoryTransactionModalProps) {
  const isMobile = useIsMobile();
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      quantity: 0,
      notes: '',
    },
  });

  const handleSubmit = (data: FormData) => {
    onSave(data.quantity, data.notes);
    form.reset();
    onClose();
  };

  const content = (
    <Form {...form}>
      <form id="transaction-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Current Stock: {item.current_quantity} {item.unit_type}
        </div>

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Quantity {type === 'usage' ? 'Used' : 'Added'} ({item.unit_type}) *
              </FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  step="0.01" 
                  {...field} 
                  placeholder="0.00"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  rows={3}
                  placeholder="Additional details about this transaction..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );

  const actions = (
    <>
      <Button type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" form="transaction-form">
        {type === 'usage' ? 'Record Usage' : 'Record Restock'}
      </Button>
    </>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onClose}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader>
            <DrawerTitle>
              {type === 'usage' ? 'Record Usage' : 'Record Restock'} - {item.name}
            </DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-4">
            {content}
          </div>
          <DrawerFooter className="flex-row gap-2">
            {actions}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === 'usage' ? 'Record Usage' : 'Record Restock'} - {item.name}
          </DialogTitle>
        </DialogHeader>
        {content}
        <div className="flex justify-end gap-2 pt-4">
          {actions}
        </div>
      </DialogContent>
    </Dialog>
  );
}
