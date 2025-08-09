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
import { Quote } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';

type SortKey = 'customer' | 'amount' | 'status' | 'updated';
type SortDir = 'asc' | 'desc';

export default function QuotesPage() {
  const store = useStore();
  const { toast } = useToast();
  const clerkAuth = useClerkAuth();

  async function buildAuthHeaders(): Promise<Record<string, string>> {
    try {
      const headers: Record<string, string> = {};
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
        return headers;
      }
      if (clerkAuth?.isSignedIn) {
        const token = await clerkAuth.getToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }
      return headers;
    } catch {
      return {};
    }
  }

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<Quote>>({
    lineItems: [],
    taxRate: 0, // default to zero
    discount: 0,
    paymentTerms: 'due_on_receipt',
    depositRequired: false,
    depositPercent: 0,
    frequency: 'one-off',
  });

  // Email preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewSubject, setPreviewSubject] = useState('');
  const [previewHTML, setPreviewHTML] = useState('');

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

  // Pretty email helpers
  function formatPaymentTermsLabel(terms: string) {
    switch (terms) {
      case 'due_on_receipt': return 'Due on receipt';
      case 'net_15': return 'Net 15';
      case 'net_30': return 'Net 30';
      case 'net_60': return 'Net 60';
      default: return terms || 'Due on receipt';
    }
  }

   function renderQuoteEmailHTML(params: {
     number: string;
     businessName: string;
     customerName: string;
     items: { name: string; qty?: number; unitPrice?: number; lineTotal?: number }[];
     subtotal: number;
     taxRate: number;
     discount: number;
     total: number;
     address?: string;
     terms?: string;
     depositRequired?: boolean;
     depositPercent?: number;
     paymentTerms?: string;
     frequency?: string;
     viewLink?: string;
   }) {
    const rows = (params.items || []).map((li) => {
      const qty = li.qty ?? 1;
      const unit = formatMoney(li.unitPrice ?? 0);
      const amt = formatMoney(li.lineTotal ?? Math.round(qty * (li.unitPrice ?? 0)));
      return `<tr>
        <td style="padding:12px 8px;border-bottom:1px solid #eee;">${li.name || ''}</td>
        <td style="padding:12px 8px;text-align:center;border-bottom:1px solid #eee;">${qty}</td>
        <td style="padding:12px 8px;text-align:right;border-bottom:1px solid #eee;">${unit}</td>
        <td style="padding:12px 8px;text-align:right;border-bottom:1px solid #eee;">${amt}</td>
      </tr>`;
    }).join('');

    const discountRow = params.discount > 0 ? `<tr>
      <td style="padding:8px 8px;text-align:right" colspan="3">Discount</td>
      <td style="padding:8px 8px;text-align:right">- ${formatMoney(params.discount)}</td>
    </tr>` : '';

    const depositLine = params.depositRequired ? `<p style="margin:6px 0 0;color:#555;">Deposit: ${params.depositPercent ?? 0}% due to schedule.</p>` : '';

    return `
    <div style="background:#f6f9fc;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e6eaf1;border-radius:10px;overflow.hidden;">
        <div style="background:#0f172a;color:#fff;padding:20px 24px;">
          <div style="font-size:18px;font-weight:600">${params.businessName}</div>
          <div style="opacity:0.85;font-size:14px">Quote ${params.number}</div>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 12px;color:#111;">Hi ${params.customerName},</p>
          <p style="margin:0 0 16px;color:#333;">Please find your quote below. Total amount is <strong>${formatMoney(params.total)}</strong>.</p>
          ${params.viewLink ? `<div style="margin:16px 0 20px;"><a href="${params.viewLink}" target="_blank" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600">View your quote</a></div>` : ''}

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:12px 0 4px;">
            <thead>
              <tr>
                <th align="left" style="padding:8px;color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:.02em">Item</th>
                <th align="center" style="padding:8px;color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:.02em">Qty</th>
                <th align="right" style="padding:8px;color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:.02em">Price</th>
                <th align="right" style="padding:8px;color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:.02em">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:8px;">
            <tr>
              <td style="padding:8px 8px;text-align:right" colspan="3">Subtotal</td>
              <td style="padding:8px 8px;text-align:right">${formatMoney(params.subtotal)}</td>
            </tr>
            <tr>
              <td style="padding:8px 8px;text-align:right" colspan="3">Tax (${Math.round((params.taxRate || 0) * 100)}%)</td>
              <td style="padding:8px 8px;text-align:right">${formatMoney(Math.round(params.subtotal * (params.taxRate || 0)))}</td>
            </tr>
            ${discountRow}
            <tr>
              <td style="padding:12px 8px;text-align:right;border-top:2px solid #e5e7eb;font-weight:700" colspan="3">Total</td>
              <td style="padding:12px 8px;text-align:right;border-top:2px solid #e5e7eb;font-weight:700">${formatMoney(params.total)}</td>
            </tr>
          </table>

          <div style="margin-top:16px;color:#4b5563;font-size:14px;">
            ${params.paymentTerms && params.paymentTerms !== 'due_on_receipt' ? `<p style="margin:0 0 6px;">Payment terms: ${formatPaymentTermsLabel(params.paymentTerms)}</p>` : ''}
            ${params.frequency && params.frequency !== 'one-off' ? `<p style="margin:6px 0 0;">Frequency: ${({ 'bi-monthly':'Bi-monthly', 'monthly':'Monthly', 'bi-yearly':'Bi-yearly', 'yearly':'Yearly' } as any)[params.frequency] || params.frequency}</p>` : ''}
            ${depositLine}
            ${params.address ? `<p style=\"margin:6px 0 0;\">Service address: ${params.address}</p>` : ''}
          </div>
 
           ${params.terms ? `<div style=\"margin-top:16px;padding:12px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;color:#374151;font-size:13px;\">
             <div style=\"font-weight:600;margin-bottom:6px;\">Terms</div>
             <div>${params.terms}</div>
           </div>` : ''}

          <p style="margin-top:20px;color:#334155;">Thank you,<br/>${params.businessName}</p>
        </div>
      </div>
      <div style="max-width:640px;margin:8px auto 0;text-align:center;color:#6b7280;font-size:12px;">This is an automated message. Please reply if you have any questions.</div>
    </div>`;
  }

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
    const e = store.upsertQuote({ ...draft, customerId: draft.customerId! });
    setOpen(false);
    resetDraft();
    toast({ title: 'Quote saved', description: `Saved quote ${e.number}` });
  }

   async function sendEmailForQuote(e: Quote) {
     const customer = store.customers.find((c) => c.id === e.customerId);
     const to = customer?.email;
     if (!to) {
       toast({ title: 'No email on file', description: 'Add an email to the customer to send the quote.' });
       return;
     }

    const headers = await buildAuthHeaders();

    const subject = `Quote ${e.number} — ${store.business.name} — ${formatMoney(e.total)}`;
    const html = renderQuoteEmailHTML({
      number: e.number,
      businessName: store.business.name,
      customerName: customer.name,
      items: e.lineItems || [],
      subtotal: e.subtotal ?? 0,
      taxRate: e.taxRate ?? 0,
      discount: e.discount ?? 0,
      total: e.total,
      address: e.address,
      terms: e.terms,
      depositRequired: e.depositRequired,
      depositPercent: e.depositPercent,
      paymentTerms: e.paymentTerms,
      frequency: e.frequency,
      // No public link included anymore
    });

    const { data, error } = await supabase.functions.invoke('resend-send-email', {
      body: {
        to,
        subject,
        html,
        quote_id: e.id,
        from_name: store.business.name,
        reply_to: store.business.replyToEmail || undefined,
      },
      headers,
    });

    console.log('resend-send-email response', { data, error });

    if (error) {
      console.error('resend-send-email error', error);
      const status = (error as any)?.status;
      const msg = status === 401
        ? 'You are not authenticated. Please sign in and try again.'
        : (error.message || 'There was a problem sending the email.');
      toast({ title: 'Failed to send', description: msg, variant: 'destructive' });
      return;
    }

    const payload = data as any;
    if (payload?.error) {
      const raw = String(payload.error);
      console.error('resend-send-email payload error', raw);
      const lower = raw.toLowerCase();
      let friendly = raw;
      if (lower.includes('domain') && lower.includes('not verified')) {
        friendly = 'Your sending domain is not verified. Verify your domain in Resend (resend.com/domains) or use a verified from email.';
      }
      toast({ title: 'Failed to send', description: friendly, variant: 'destructive' });
    } else {
      toast({ title: 'Quote sent', description: `Email sent to ${to}.` });
    }
  }

  async function saveAndSend() {
    if (!draft.customerId) {
      toast({ title: 'Select customer', description: 'Please choose a customer before sending.' });
      return;
    }
    const e = store.upsertQuote({ ...draft, customerId: draft.customerId! });
    store.sendQuote(e.id);
    await sendEmailForQuote(e);
    setOpen(false);
    resetDraft();
  }

  function openPreview() {
    const customer = draft.customerId ? store.customers.find((c) => c.id === draft.customerId) : undefined;
    const lineItems = draft.lineItems ?? [];
    const subtotal = lineItems.reduce((s, l) => s + Math.round((l.qty ?? 1) * (l.unitPrice ?? 0)), 0);
    const taxRate = (draft.taxRate ?? store.business.taxRateDefault ?? 0) as number;
    const tax = Math.round(subtotal * taxRate);
    const discount = draft.discount ?? 0;
    const total = Math.max(0, subtotal + tax - discount);
    const number = draft.number ?? 'Draft';
    const subject = `Quote ${number} — ${store.business.name} — ${formatMoney(total)}`;
    const html = renderQuoteEmailHTML({
      number,
      businessName: store.business.name,
      customerName: customer?.name ?? 'Customer',
      items: lineItems,
      subtotal,
      taxRate,
      discount,
      total,
      address: draft.address,
      terms: draft.terms ?? 'Payment due upon receipt. Thank you for your business.',
      depositRequired: !!draft.depositRequired,
      depositPercent: draft.depositPercent ?? 0,
      paymentTerms: draft.paymentTerms ?? 'due_on_receipt',
      frequency: draft.frequency,
    });
    setPreviewSubject(subject);
    setPreviewHTML(html);
    setPreviewOpen(true);
  }



  function send(est: Quote) {
    store.sendQuote(est.id);
    sendEmailForQuote(est);
  }

  const sortedQuotes = useMemo(() => {
    const arr = [...store.quotes];
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
  }, [store.quotes, store.customers, sortKey, sortDir]);

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
                {sortedQuotes.map((e) => (
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
                            <Button>Action</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="z-50">
            <DropdownMenuItem disabled={e.status==='Sent'} onClick={()=>send(e)}>Send Email</DropdownMenuItem>
            
            <DropdownMenuItem onClick={()=>store.convertQuoteToJob(e.id, undefined, undefined, undefined)}>Create Work Order</DropdownMenuItem>
            <DropdownMenuItem onClick={()=>{
              const jobs = store.convertQuoteToJob(e.id);
              if (jobs.length > 0) {
                store.createInvoiceFromJob(jobs[0].id);
                toast({ title: 'Invoice created', description: 'An invoice draft was created from this quote.' });
              }
            }}>Create Invoice</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {e.status==='Approved' && <Button onClick={()=>store.convertQuoteToJob(e.id, undefined, undefined, undefined)}>Convert to Job</Button>}
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

          <div className="flex items-center justify-end">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={()=>setOpen(false)}>Cancel</Button>
              <Button variant="secondary" onClick={save}>Save</Button>
              <Button variant="secondary" onClick={openPreview}>Preview Email</Button>
              <Button onClick={saveAndSend}>Save & Send</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Email Preview</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Subject</div>
              <div className="text-sm font-medium">{previewSubject}</div>
            </div>
            <div className="border rounded-md overflow-hidden">
              <iframe title="Email preview" className="w-full h-[480px] bg-background" srcDoc={previewHTML}></iframe>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </AppLayout>
  );
}
