
import AppLayout from '@/components/Layout/AppLayout';
import { useCustomers } from '@/queries/unified';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { formatDate, formatMoney } from '@/utils/format';
import { useEffect, useMemo, useState } from 'react';
import { useSupabaseInvoices } from '@/hooks/useSupabaseInvoices';
import { useSupabaseCustomers } from '@/hooks/useSupabaseCustomers';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import InvoiceEditor from '@/pages/Invoices/InvoiceEditor';
import SendInvoiceModal from '@/components/Invoices/SendInvoiceModal';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Send } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { invalidationHelpers } from '@/queries/keys';


export default function InvoicesPage() {
  const { data: customersUnified = [] } = useCustomers();
  const { isSignedIn } = useClerkAuth();
  const { data: invoicesData } = useSupabaseInvoices();
  const { data: customersData } = useSupabaseCustomers();
  
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'All' | 'Draft' | 'Sent' | 'Paid' | 'Overdue'>('All');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sendId, setSendId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'number' | 'customer' | 'amount' | 'due' | 'status'>('number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const qc = useQueryClient();
  
  // Use customer data directly from hook
  const customers = customersData?.rows || [];

  useEffect(() => {
    if (!isSignedIn) return;
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        const businessId = ''; // TODO: Get from context if needed
        if (businessId) {
          invalidationHelpers.invoices(qc, businessId);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_line_items' }, () => {
        const businessId = ''; // TODO: Get from context if needed  
        if (businessId) {
          invalidationHelpers.invoices(qc, businessId);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, isSignedIn]);

  // Use invoices directly from the hook instead of store
  const invoices = useMemo(() => {
    if (!invoicesData?.rows) return [];
    return invoicesData.rows.map(row => ({
      id: row.id,
      number: row.number,
      businessId: '',
      customerId: row.customerId,
      jobId: row.jobId || undefined,
      lineItems: [] as any[],
      taxRate: row.taxRate,
      discount: row.discount,
      subtotal: row.subtotal,
      total: row.total,
      status: row.status as any,
      dueAt: row.dueAt || undefined,
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      publicToken: row.publicToken || '',
    }));
  }, [invoicesData?.rows]);

  const filteredInvoices = useMemo(() => {
    let list = invoices.slice();
    if (status !== 'All') list = list.filter(i => i.status === status);
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter(i => i.number.toLowerCase().includes(query) || ((customers.find(c=>c.id===i.customerId)?.name?.toLowerCase().includes(query)) ?? false));
    }
    return list;
  }, [invoices, status, q, customers]);

  const sortedInvoices = useMemo(() => {
    const list = filteredInvoices.slice();
    list.sort((a, b) => {
      let va: any;
      let vb: any;
      switch (sortKey) {
        case 'number':
          va = a.number || '';
          vb = b.number || '';
          break;
        case 'customer':
          va = customers.find(c => c.id === a.customerId)?.name || '';
          vb = customers.find(c => c.id === b.customerId)?.name || '';
          break;
        case 'amount':
          va = a.total ?? 0;
          vb = b.total ?? 0;
          break;
        case 'due':
          va = a.dueAt ? new Date(a.dueAt).getTime() : Number.POSITIVE_INFINITY;
          vb = b.dueAt ? new Date(b.dueAt).getTime() : Number.POSITIVE_INFINITY;
          break;
        case 'status':
          va = a.status || '';
          vb = b.status || '';
          break;
        default:
          va = '';
          vb = '';
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredInvoices, sortKey, sortDir, customers]);

  const requestSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };


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
                <TableHead>
                    <button className="flex items-center gap-1" onClick={() => requestSort('number')} aria-label="Sort by number">
                      Number{sortKey === 'number' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                </TableHead>
                <TableHead>
                    <button className="flex items-center gap-1" onClick={() => requestSort('customer')} aria-label="Sort by customer">
                      Customer{sortKey === 'customer' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                </TableHead>
                <TableHead>
                    <button className="flex items-center gap-1" onClick={() => requestSort('amount')} aria-label="Sort by amount">
                      Amount{sortKey === 'amount' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                </TableHead>
                <TableHead>
                    <button className="flex items-center gap-1" onClick={() => requestSort('due')} aria-label="Sort by due date">
                      Due{sortKey === 'due' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                </TableHead>
                <TableHead>
                    <button className="flex items-center gap-1" onClick={() => requestSort('status')} aria-label="Sort by status">
                      Status{sortKey === 'status' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                </TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.map((i)=> (
                <TableRow key={i.id}>
                  <TableCell>{i.number}</TableCell>
                  <TableCell>{customers.find(c=>c.id===i.customerId)?.name}</TableCell>
                  <TableCell>{formatMoney(i.total)}</TableCell>
                  <TableCell>{formatDate(i.dueAt)}</TableCell>
                  <TableCell>{i.status}</TableCell>
                  <TableCell className="text-center">
                        <div className="flex gap-2 justify-center">
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
        invoice={invoices.find(inv=>inv.id===activeId) || null}
      />
      <SendInvoiceModal
        open={!!sendId}
        onOpenChange={(o)=>{ if(!o) setSendId(null); }}
        invoice={invoices.find(inv=>inv.id===sendId) || null}
        toEmail={( () => {
          const inv = invoices.find(i=>i.id===sendId);
          const cust = inv ? customers.find(c=>c.id===inv.customerId) : undefined;
          return cust?.email || '';
        })()}
        customerName={( () => {
          const inv = invoices.find(i=>i.id===sendId);
          const cust = inv ? customers.find(c=>c.id===inv.customerId) : undefined;
          return cust?.name || undefined;
        })()}
      />
    </AppLayout>
  );
}
