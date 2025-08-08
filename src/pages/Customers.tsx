import AppLayout from '@/components/Layout/AppLayout';
import { useStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function CustomersPage() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ name: '', email: '', phone: '', address: '' });

  function save() {
    store.upsertCustomer(draft);
    setOpen(false);
    setDraft({ name: '', email: '', phone: '', address: '' });
  }

  return (
    <AppLayout title="Customers">
      <section className="space-y-4">
        <div className="flex justify-end"><Button onClick={()=>setOpen(true)}>New Customer</Button></div>
        <Card>
          <CardHeader><CardTitle>All Customers</CardTitle></CardHeader>
          <CardContent>
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
                {store.customers.map((c)=> (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.address}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Customer</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Name" value={draft.name} onChange={(e)=>setDraft({...draft, name:e.target.value})} />
            <Input placeholder="Email" value={draft.email} onChange={(e)=>setDraft({...draft, email:e.target.value})} />
            <Input placeholder="Phone" value={draft.phone} onChange={(e)=>setDraft({...draft, phone:e.target.value})} />
            <Input placeholder="Address" value={draft.address} onChange={(e)=>setDraft({...draft, address:e.target.value})} />
            <div className="flex justify-end gap-2"><Button variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={save}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
