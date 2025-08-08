
import AppLayout from '@/components/Layout/AppLayout';
import { useStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatMoney, formatDate } from '@/utils/format';
import { useMemo, useState } from 'react';
import { Estimate } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';

type SortKey = 'customer' | 'amount' | 'status' | 'updated';
type SortDir = 'asc' | 'desc';

export default function EstimatesPage() {
  const store = useStore();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Estimate>>({
    lineItems: [],
    taxRate: 0, // default to zero
    discount: 0,
    paymentTerms: 'due_on_receipt',
    depositRequired: false,
    depositPercent: 0,
    frequency: 'one-off',
  });

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>('updated');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const totals = useMemo(() => {
    const li = draft.lineItems ?? [];
    const subtotal = li.reduce((s, l) => s + Math.round((l.qty ?? 1) * (l.unitPrice ?? 0)), 0);
    const tax = Math.round(subtotal * (draft.taxRate ?? 0));
    const total = Math.max(0, subtotal + tax - (draft.discount ?? 0));
    return { subtotal, total };
  }, [draft]);

  function addLine() {
    setDraft((d) => ({
      ...d,
      lineItems: [...(d.lineItems ?? []), { id: crypto.randomUUID(), name: '', qty: 1, unitPrice: 0, lineTotal: 0 }],
    }));
  }

  function resetDraft() {
    setDraft({
      lineItems: [],
      taxRate: 0,
      discount: 0,
      paymentTerms: 'due_on_receipt',
      depositRequired: false,
      depositPercent: 0,
      frequency: 'one-off',
    });
  }

  function save() {
    const e = store.upsertEstimate({ ...draft, customerId: draft.customerId! });
    setOpen(false);
    resetDraft();
    toast({ title: 'Quote saved', description: `Saved quote ${e.number}` });
  }

  async function sendEmailForEstimate(e: Estimate) {
    const customer = store.customers.find((c) => c.id === e.customerId);
    const to = customer?.email;
    if (!to) {
      toast({ title: 'No email on file', description: 'Add an email to the customer to send the quote.' });
      return;
    }
    const bodyHtml = `
      <div style="font-family:system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif; line-height:1.5">
        <h2 style="margin:0 0 8px">Quote ${e.number}</h2>
        <p>Dear ${customer.name},</p>
        <p>Please review your quote totaling <strong>${formatMoney(e.total)}</strong>.</p>
        <ul>
          ${(e.lineItems || []).map(li => `<li>${li.name} — ${formatMoney(li.unitPrice)}</li>`).join('')}
        </ul>
        <p>Thank you,<br/>${store.business.name}</p>
      </div>
    `;
    const { data, error } = await supabase.functions.invoke('send-quote', {
      body: { to, subject: `Quote ${e.number} from ${store.business.name}`, html: bodyHtml },
    });
    console.log('send-quote response', { data, error });
    if (error) {
      console.error('send-quote error', error);
      toast({ title: 'Failed to send', description: error.message || 'There was a problem sending the email.' });
    } else if ((data as any)?.error) {
      console.error('send-quote payload error', (data as any).error);
      toast({ title: 'Failed to send', description: (data as any).error || 'Unknown error from email service.' });
    } else {
      toast({ title: 'Quote sent', description: `Email sent to ${to}` });
    }
  }

  async function saveAndSend() {
    if (!draft.customerId) {
      toast({ title: 'Select customer', description: 'Please choose a customer before sending.' });
      return;
    }
    const e = store.upsertEstimate({ ...draft, customerId: draft.customerId! });
    store.sendEstimate(e.id);
    await sendEmailForEstimate(e);
    setOpen(false);
    resetDraft();
  }

  function send(est: Estimate) {
    store.sendEstimate(est.id);
    sendEmailForEstimate(est);
  }


  const sortedEstimates = useMemo(() => {
    const arr = [...store.estimates];
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'customer': {
          const an = store.customers.find(c => c.id === a.customerId)?.name || '';
          const bn = store.customers.find(c => c.id === b.customerId)?.name || '';
          return sortDir === 'asc' ? an.localeCompare(bn) : bn.localeCompare(an);
        }
        case 'amount':
          return sortDir === 'asc' ? a.total - b.total : b.total - a.total;
        case 'status':
          return sortDir === 'asc' ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
        case 'updated': {
          const at = new Date(a.updatedAt).getTime();
          const bt = new Date(b.updatedAt).getTime();
          return sortDir === 'asc' ? at - bt : bt - at;
        }
        default:
          return 0;
      }
    });
    return arr;
  }, [store.estimates, store.customers, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (k === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(k);
      setSortDir('asc');
    }
  }

  return (
    <AppLayout title="Quotes">
      <section className="space-y-4">
        <div className="flex justify-end gap-2">
          <Button onClick={() => setOpen(true)}>Create Quote</Button>
        </div>

        <Card>
          <CardHeader><CardTitle>All Quotes</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No.</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('customer')}>
                    Customer {sortKey === 'customer' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                    Amount {sortKey === 'amount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('status')}>
                    Status {sortKey === 'status' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('updated')}>
                    Updated {sortKey === 'updated' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEstimates.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{e.number}</TableCell>
                    <TableCell>{store.customers.find(c=>c.id===e.customerId)?.name}</TableCell>
                    <TableCell>{formatMoney(e.total)}</TableCell>
                    <TableCell>
                      {e.status}{e.viewCount ? ` (Viewed ${e.viewCount})` : ''}
                    </TableCell>
                    <TableCell>{formatDate(e.updatedAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="secondary" onClick={()=>{ setDraft(e); setOpen(true); }}>Edit</Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button>Send</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-50">
                            <DropdownMenuItem onClick={()=>send(e)}>Send Email</DropdownMenuItem>
                            <DropdownMenuItem onClick={()=>store.convertEstimateToJob(e.id, undefined, undefined, undefined)}>Create Work Order</DropdownMenuItem>
                            <DropdownMenuItem onClick={()=>{
                              const jobs = store.convertEstimateToJob(e.id);
                              if (jobs.length > 0) {
                                store.createInvoiceFromJob(jobs[0].id);
                                toast({ title: 'Invoice created', description: 'An invoice draft was created from this quote.' });
                              }
                            }}>Create Invoice</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      <Dialog open={open} onOpenChange={(v)=>{ setOpen(v); if (!v) resetDraft(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{draft.id? 'Edit Quote' : 'Create Quote'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Customer</Label>
              <select className="w-full border rounded-md h-9 px-3 bg-background" value={draft.customerId ?? ''} onChange={(e)=>setDraft({...draft, customerId: e.target.value})}>
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
                    <Input className="col-span-8" placeholder="Name" value={li.name} onChange={(e)=>{
                      const items=[...(draft.lineItems ?? [])]; items[idx] = { ...li, name: e.target.value }; setDraft({ ...draft, lineItems: items });
                    }} />
                    {/* Price input in dollars; step $10 */}
                    <div className="col-span-4 flex items-center gap-2">
                      <div className="px-2 text-muted-foreground">$</div>
                      <Input
                        className="text-right"
                        type="number"
                        inputMode="decimal"
                        step={10}
                        min={0}
                        value={((li.unitPrice ?? 0) / 100).toString()}
                        onChange={(e)=>{
                          const dollars = Number(e.target.value || '0');
                          const cents = Math.max(0, Math.round(dollars * 100));
                          const items=[...(draft.lineItems ?? [])];
                          items[idx] = { ...li, unitPrice: cents, lineTotal: cents * (li.qty ?? 1) };
                          setDraft({ ...draft, lineItems: items });
                        }}
                      />
                    </div>
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
              <Label>Discount (dollars)</Label>
              <div className="flex items-center gap-2">
                <div className="px-2 text-muted-foreground">$</div>
                <Input
                  type="number"
                  inputMode="decimal"
                  step={1}
                  min={0}
                  value={((draft.discount ?? 0) / 100).toString()}
                  onChange={(e)=>{
                    const dollars = Number(e.target.value || '0');
                    setDraft({ ...draft, discount: Math.max(0, Math.round(dollars * 100)) });
                  }}
                />
              </div>
            </div>

            <div>
              <Label>Payment terms</Label>
              <select className="w-full border rounded-md h-9 px-3 bg-background" value={draft.paymentTerms ?? 'due_on_receipt'} onChange={(e)=>setDraft({...draft, paymentTerms: e.target.value as any})}>
                <option value="due_on_receipt">Due on receipt</option>
                <option value="net_15">Net 15</option>
                <option value="net_30">Net 30</option>
                <option value="net_60">Net 60</option>
              </select>
            </div>
            <div>
              <Label>Frequency</Label>
              <select className="w-full border rounded-md h-9 px-3 bg-background" value={draft.frequency ?? 'one-off'} onChange={(e)=>setDraft({...draft, frequency: e.target.value as any})}>
                <option value="one-off">One-off</option>
                <option value="bi-monthly">Bi-monthly</option>
                <option value="monthly">Monthly</option>
                <option value="bi-yearly">Bi-yearly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 mt-2">
                <input
                  id="depositRequired"
                  type="checkbox"
                  checked={!!draft.depositRequired}
                  onChange={(e)=>setDraft({...draft, depositRequired: e.target.checked})}
                />
                <Label htmlFor="depositRequired" className="cursor-pointer">Deposit required</Label>
              </div>
              <div>
                <Label>Deposit percent</Label>
                <Input
                  type="number"
                  step={5}
                  min={0}
                  max={100}
                  value={draft.depositPercent ?? 0}
                  disabled={!draft.depositRequired}
                  onChange={(e)=>setDraft({...draft, depositPercent: Math.max(0, Math.min(100, Number(e.target.value || '0')))})}
                />
              </div>
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
              <Button variant="secondary" onClick={save}>Save</Button>
              <Button onClick={saveAndSend}>Save & Send</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
