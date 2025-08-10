import AppLayout from '@/components/Layout/AppLayout';
import { useStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { formatDate, formatMoney } from '@/utils/format';
import { useEffect, useMemo, useState } from 'react';
import { useSupabaseInvoices } from '@/hooks/useSupabaseInvoices';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import InvoiceEditor from '@/pages/Invoices/InvoiceEditor';
import SendInvoiceModal from '@/components/Invoices/SendInvoiceModal';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
export default function InvoicesPage() {
  const store = useStore();
  const { isSignedIn } = useClerkAuth();
  const { data: dbInvoices } = useSupabaseInvoices({ enabled: !!isSignedIn });
  const [processing, setProcessing] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'All' | 'Draft' | 'Sent' | 'Paid' | 'Overdue'>('All');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sendId, setSendId] = useState<string | null>(null);
  const qc = useQueryClient();

  useEffect(() => {
    if (!isSignedIn) return;
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        qc.invalidateQueries({ queryKey: ['supabase', 'invoices'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_line_items' }, () => {
        qc.invalidateQueries({ queryKey: ['supabase', 'invoices'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || !dbInvoices?.rows) return;
    dbInvoices.rows.forEach((row) => {
      store.upsertInvoice({
        id: row.id,
        number: row.number,
        businessId: '',
        customerId: row.customerId,
        jobId: row.jobId || undefined,
        lineItems: [],
        taxRate: row.taxRate,
        discount: row.discount,
        subtotal: row.subtotal,
        total: row.total,
        status: row.status,
        dueAt: row.dueAt || undefined,
        createdAt: row.createdAt || new Date().toISOString(),
        updatedAt: row.updatedAt || new Date().toISOString(),
        publicToken: row.publicToken || '',
      });
    });
  }, [isSignedIn, dbInvoices]);

  const filteredInvoices = useMemo(() => {
    let list = store.invoices.slice();
    if (status !== 'All') list = list.filter(i => i.status === status);
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter(i => i.number.toLowerCase().includes(query) || (store.customers.find(c=>c.id===i.customerId)?.name?.toLowerCase().includes(query) ?? false));
    }
    return list;
  }, [store.invoices, status, q, store.customers]);

  

  return (
    <AppLayout title="Invoices">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>All Invoices</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search number or customer…"
                value={q}
                onChange={(e)=>setQ(e.target.value)}
                className="w-48 sm:w-64"
              />
              <div className="flex gap-1">
                {(['All','Draft','Sent','Paid','Overdue'] as const).map(s => (
                  <Button
                    key={s}
                    variant={status===s ? 'default' : 'outline'}
                    size="sm"
                    onClick={()=>setStatus(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Number</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((i)=> (
                <TableRow key={i.id}>
                  <TableCell>{i.number}</TableCell>
                  <TableCell>{store.customers.find(c=>c.id===i.customerId)?.name}</TableCell>
                  <TableCell>{formatMoney(i.total)}</TableCell>
                  <TableCell>{formatDate(i.dueAt)}</TableCell>
                  <TableCell>{i.status}</TableCell>
                  <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSendId(i.id)}
                                  disabled={i.status!=='Draft'}
                                  aria-label="Send invoice"
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Send Invoice</TooltipContent>
                          </Tooltip>

                          {i.status==='Sent' && <Button size="sm" onClick={()=>{ setProcessing(i.id); setTimeout(()=>{ store.markInvoicePaid(i.id, '4242'); setProcessing(null); }, 800); }}>Mark Paid</Button>}
                          {processing===i.id && <span className="text-sm text-muted-foreground">Processing…</span>}
                        </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <InvoiceEditor
        open={!!activeId}
        onOpenChange={(o)=>{ if(!o) setActiveId(null); }}
        invoice={store.invoices.find(inv=>inv.id===activeId) || null}
      />
      <SendInvoiceModal
        open={!!sendId}
        onOpenChange={(o)=>{ if(!o) setSendId(null); }}
        invoice={store.invoices.find(inv=>inv.id===sendId) || null}
        toEmail={( () => {
          const inv = store.invoices.find(i=>i.id===sendId);
          const cust = inv ? store.customers.find(c=>c.id===inv.customerId) : undefined;
          return cust?.email || '';
        })()}
        customerName={( () => {
          const inv = store.invoices.find(i=>i.id===sendId);
          const cust = inv ? store.customers.find(c=>c.id===inv.customerId) : undefined;
          return cust?.name || undefined;
        })()}
      />
    </AppLayout>
  );
}
