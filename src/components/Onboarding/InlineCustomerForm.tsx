import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { edgeFetchJson } from '@/utils/edgeApi';

interface InlineCustomerFormProps {
  onCustomerCreated: (customerId: string, customerName: string) => void;
  trigger?: React.ReactNode;
}

export function InlineCustomerForm({ onCustomerCreated, trigger }: InlineCustomerFormProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  const { getToken } = useClerkAuth();
  const queryClient = useQueryClient();

  async function handleSave() {
    if (!draft.name.trim()) {
      toast.error('Customer name is required');
      return;
    }

    setSaving(true);
    try {
      const result = await edgeFetchJson('customers', getToken, {
        method: 'POST',
        body: {
          name: draft.name.trim(),
          email: draft.email.trim() || null,
          phone: draft.phone.trim() || null,
          address: draft.address.trim() || null,
        },
      });

      const customer = result?.customer || result;
      
      toast.success('Customer created');
      onCustomerCreated(customer.id, customer.name);
      
      // Reset form
      setDraft({ name: '', email: '', phone: '', address: '' });
      setOpen(false);
      
      // Refresh customer list
      queryClient.invalidateQueries({ queryKey: ['supabase', 'customers'] });
    } catch (error: any) {
      console.error('Failed to create customer:', error);
      toast.error(error?.message || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  }

  const defaultTrigger = (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => setOpen(true)}
    >
      <Plus className="h-4 w-4" />
      New Customer
    </Button>
  );

  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        defaultTrigger
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Name *</Label>
              <Input
                id="customer-name"
                value={draft.name}
                onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter customer name"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-email">Email</Label>
              <Input
                id="customer-email"
                type="email"
                value={draft.email}
                onChange={(e) => setDraft(prev => ({ ...prev, email: e.target.value }))}
                placeholder="customer@example.com"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone</Label>
              <Input
                id="customer-phone"
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(555) 123-4567"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-address">Address</Label>
              <Input
                id="customer-address"
                value={draft.address}
                onChange={(e) => setDraft(prev => ({ ...prev, address: e.target.value }))}
                placeholder="123 Main St, City, State"
                disabled={saving}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !draft.name.trim()}
              >
                {saving ? 'Creating...' : 'Create Customer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}