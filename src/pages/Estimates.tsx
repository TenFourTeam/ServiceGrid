import AppLayout from '@/components/Layout/AppLayout';
import { useStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatMoney, formatDate } from '@/utils/format';
import { useMemo, useState } from 'react';
import { Estimate } from '@/types';

export default function EstimatesPage() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Estimate>>({ lineItems: [], taxRate: store.business.taxRateDefault, discount: 0 });
  

  const customer = store.customers.find((c) => c.id === draft.customerId);
  const totals = useMemo(() => {
    const li = draft.lineItems ?? [];
    const subtotal = li.reduce((s, l) => s + Math.round((l.qty ?? 0) * (l.unitPrice ?? 0)), 0);
    const tax = Math.round(subtotal * (draft.taxRate ?? 0));
    const total = Math.max(0, subtotal + tax - (draft.discount ?? 0));
    return { subtotal, total };
  }, [draft]);

  function addLine() {
    setDraft((d) => ({ ...d, lineItems: [...(d.lineItems ?? []), { id: crypto.randomUUID(), name: '', qty: 1, unitPrice: 0, lineTotal: 0 }] }));
  }

  function save() {
    const e = store.upsertEstimate({ ...draft, customerId: draft.customerId! });
    setOpen(false);
    setDraft({ lineItems: [], taxRate: store.business.taxRateDefault, discount: 0 });
  }

  function send(est: Estimate) { store.sendEstimate(est.id); }

  return (
    <AppLayout title="Estimates">
      <section className="space-y-4">
        <div className="flex justify-end"><Button onClick={() => setOpen(true)}>New Estimate</Button></div>
        <Card>
          <CardHeader><CardTitle>All Estimates</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {store.estimates.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.number}</TableCell>
                    <TableCell>{store.customers.find(c=>c.id===e.customerId)?.name}</TableCell>
                    <TableCell>{formatMoney(e.total)}</TableCell>
                    <TableCell>{e.status}</TableCell>
                    <TableCell>{formatDate(e.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={()=>{ setDraft(e); setOpen(true); }}>Edit</Button>
                        <Button onClick={()=>send(e)}>Send</Button>
                        {e.status==='Approved' && <Button onClick={()=>store.convertEstimateToJob(e.id, undefined, undefined, undefined)}>Convert to Job</Button>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{draft.id? 'Edit Estimate' : 'New Estimate'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Customer</Label>
              <select className="w-full border rounded-md h-9 px-3" value={draft.customerId ?? ''} onChange={(e)=>setDraft({...draft, customerId: e.target.value})}>
                <option value="">Select…</option>
                {store.customers.map((c)=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Service address</Label>
              <Input value={draft.address ?? ''} onChange={(e)=>setDraft({...draft, address: e.target.value})} />
            </div>
            <div className="col-span-2">
              <Label>Line items</Label>
              <div className="space-y-2 mt-2">
                {(draft.lineItems ?? []).map((li, idx) => (
                  <div key={li.id} className="grid grid-cols-12 gap-2">
                    <Input className="col-span-5" placeholder="Name" value={li.name} onChange={(e)=>{
                      const items=[...(draft.lineItems ?? [])]; items[idx] = { ...li, name: e.target.value }; setDraft({ ...draft, lineItems: items });
                    }} />
                    <Input className="col-span-2" type="number" min={0} value={li.qty} onChange={(e)=>{ const q=Number(e.target.value); const items=[...(draft.lineItems ?? [])]; items[idx] = { ...li, qty:q, lineTotal: Math.round(q*(li.unitPrice??0)) }; setDraft({ ...draft, lineItems: items }); }} />
                    <Input className="col-span-3" type="number" min={0} value={li.unitPrice} onChange={(e)=>{ const p=Number(e.target.value); const items=[...(draft.lineItems ?? [])]; items[idx] = { ...li, unitPrice:p, lineTotal: Math.round((li.qty??0)*p) }; setDraft({ ...draft, lineItems: items }); }} />
                    <div className="col-span-2 flex items-center justify-end text-sm">{formatMoney(li.lineTotal ?? 0)}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2"><Button variant="secondary" onClick={addLine}>Add line</Button></div>
            </div>
            <div>
              <Label>Tax rate</Label>
              <Input type="number" step="0.01" value={draft.taxRate ?? 0} onChange={(e)=>setDraft({...draft, taxRate: Number(e.target.value)})} />
            </div>
            <div>
              <Label>Discount (cents)</Label>
              <Input type="number" value={draft.discount ?? 0} onChange={(e)=>setDraft({...draft, discount: Number(e.target.value)})} />
            </div>
            <div className="col-span-2">
              <Label>Terms</Label>
              <Textarea value={draft.terms ?? ''} onChange={(e)=>setDraft({...draft, terms: e.target.value})} />
            </div>
            <div className="col-span-2 flex items-center justify-end gap-6 border-t pt-4">
              <div className="text-sm">Subtotal: <span className="font-medium">{formatMoney(totals.subtotal)}</span></div>
              <div className="text-sm">Total: <span className="font-bold">{formatMoney(totals.total)}</span></div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Autosaves</div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button onClick={save}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
