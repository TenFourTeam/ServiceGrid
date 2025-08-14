import AppLayout from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { useSupabaseCustomers } from '@/hooks/useSupabaseCustomers';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { edgeFetchJson } from "@/utils/edgeApi";
import { CSVImportModal } from '@/components/Onboarding/CSVImportModal';
import { useLocation, useNavigate } from 'react-router-dom';
import { showNextActionToast } from '@/components/Onboarding/NextActionToast';
import { useOnboardingActions } from '@/onboarding/hooks';

export default function CustomersPage() {
  const { isSignedIn, getToken } = useClerkAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const onboardingActions = useOnboardingActions();

  const { data: customersData, isLoading, error } = useSupabaseCustomers();
  
  // Extract customer data directly from hook
  const rows = customersData?.rows ?? [];

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', address: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  function openNew() {
    setEditingId(null);
    setDraft({ name: '', email: '', phone: '', address: '' });
    setOpen(true);
  }

  function openEdit(c: any) {
    setEditingId(c.id);
    setDraft({ name: c.name || '', email: c.email || '', phone: (c as any).phone || '', address: c.address || '' });
    setOpen(true);
  }

  // Check for URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('import') === '1') {
      setCsvImportOpen(true);
      navigate('/customers', { replace: true });
    } else if (params.get('new') === '1') {
      openNew();
      navigate('/customers', { replace: true });
    }
  }, [location.search, navigate]);

  async function save() {
    if (!isSignedIn) {
      toast.error('You must be signed in to create customers.');
      return;
    }
    if (!draft.name.trim()) {
      toast.error('Please enter a customer name.');
      return;
    }
    if (!draft.email.trim()) {
      toast.error('Please enter a customer email.');
      return;
    }

    setSaving(true);
    try {
      const isEdit = !!editingId;

      await edgeFetchJson("customers", getToken, {
        method: isEdit ? 'PATCH' : 'POST',
        body: {
          ...(isEdit ? { id: editingId } : {}),
          name: draft.name.trim(),
          email: draft.email.trim(),
          phone: draft.phone.trim() || null,
          address: draft.address.trim() || null,
        },
      });

      // Show appropriate toast
      if (isEdit) {
        toast.success('Customer updated');
      } else {
        // Show next action toast for new customers
        showNextActionToast('customer-added', draft.name, () => {
          onboardingActions.openCreateQuote();
        });
      }
      
      setOpen(false);
      setEditingId(null);
      setDraft({ name: '', email: '', phone: '', address: '' });
      await queryClient.invalidateQueries({ queryKey: ['supabase', 'customers'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard-data'] });
    } catch (e: any) {
      console.error('[CustomersPage] save customer failed:', e);
      toast.error(e?.message || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Customers">
      <section className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setCsvImportOpen(true)}>
            Import CSV
          </Button>
          <Button onClick={() => openNew()} data-onb="add-customer-button">New Customer</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-muted-foreground">Loading customers…</div>
            ) : error ? (
              <div className="text-destructive">Error loading customers: {error.message}</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12">
                        <div className="space-y-3">
                          <div className="text-4xl">👥</div>
                          <div className="text-lg font-medium">Add customers to get started</div>
                          <div className="text-sm text-muted-foreground">
                            Add them one by one or import your existing list.
                          </div>
                           <div className="flex gap-2 justify-center">
                             <Button onClick={() => openNew()} data-onb="add-customer-button">Add Customer</Button>
                             <Button variant="outline" onClick={() => setCsvImportOpen(true)}>Import CSV</Button>
                           </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => openEdit(c)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') openEdit(c);
                        }}
                      >
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.email ?? ''}</TableCell>
                        <TableCell>{(c as any).phone ?? ''}</TableCell>
                        <TableCell>{c.address ?? ''}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Customer' : 'New Customer'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Input
              placeholder="Email *"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
              required
            />
            <Input
              placeholder="Address"
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            />
            <Input
              placeholder="Phone"
              type="tel"
              value={draft.phone}
              onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving || !draft.name.trim() || !draft.email.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CSVImportModal
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        onImportComplete={(count) => {
          // Customers list will auto-refresh due to query invalidation
        }}
      />
    </AppLayout>
  );
}
