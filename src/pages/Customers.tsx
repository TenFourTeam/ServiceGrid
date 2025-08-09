import AppLayout from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useSupabaseCustomers } from '@/hooks/useSupabaseCustomers';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const SUPABASE_URL = "https://ijudkzqfriazabiosnvb.supabase.co";

export default function CustomersPage() {
  const { isSignedIn, getToken } = useClerkAuth();
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useSupabaseCustomers();
  const rows = data?.rows ?? [];

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '', address: '' });

  async function save() {
    if (!isSignedIn) {
      toast.error('You must be signed in to create customers.');
      return;
    }
    if (!draft.name.trim()) {
      toast.error('Please enter a customer name.');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/customers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: draft.name.trim(),
          email: draft.email.trim() || null,
          address: draft.address.trim() || null,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(txt || 'Failed to create customer');
      }

      toast.success('Customer created');
      setOpen(false);
      setDraft({ name: '', email: '', address: '' });
      await queryClient.invalidateQueries({ queryKey: ['supabase', 'customers'] });
    } catch (e: any) {
      console.error('[CustomersPage] create customer failed:', e);
      toast.error(e?.message || 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout title="Customers">
      <section className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}>New Customer</Button>
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
                    <TableHead>Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-muted-foreground">
                        No customers yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>{c.name}</TableCell>
                        <TableCell>{c.email ?? ''}</TableCell>
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
            <DialogTitle>New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Name"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
            <Input
              placeholder="Email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: e.target.value })}
            />
            <Input
              placeholder="Address"
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving || !draft.name.trim()}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
