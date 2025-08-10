import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CreateQuoteModal from '@/components/Quotes/CreateQuoteModal';
import SendQuoteModal from '@/components/Quotes/SendQuoteModal';
import { Input } from '@/components/ui/input';
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useSupabaseQuotes } from '@/hooks/useSupabaseQuotes';
import { useSupabaseCustomers } from '@/hooks/useSupabaseCustomers';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useAppStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Trash2, Plus, Send, Download, Receipt, Wrench } from 'lucide-react';

import { toast } from 'sonner';
import { formatMoney as formatCurrency } from '@/utils/format';
import type { Customer, LineItem, Quote, QuoteStatus } from '@/types';
import { getClerkTokenStrict } from '@/utils/clerkToken';

interface QuoteDraft {
  customerId: string;
  address: string;
  lineItems: LineItem[];
  taxRate: number;
  discount: number;
  notesInternal: string;
  terms: string;
}

const statusColors: Record<QuoteStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-800',
  'Sent': 'bg-blue-100 text-blue-800',
  'Viewed': 'bg-yellow-100 text-yellow-800',
  'Approved': 'bg-green-100 text-green-800',
  'Declined': 'bg-red-100 text-red-800',
  'Edits Requested': 'bg-orange-100 text-orange-800',
};

function calculateLineTotal(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice);
}

function calculateQuoteTotals(lineItems: LineItem[], taxRate: number, discount: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount - discount;
  return { subtotal, taxAmount, total };
}

export default function QuotesPage() {
  const { isSignedIn, getToken } = useClerkAuth();
  const store = useStore();
  const { data: dbQuotes } = useSupabaseQuotes({ enabled: !!isSignedIn });
  const { data: dbCustomers } = useSupabaseCustomers({ enabled: !!isSignedIn });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [sendQuoteItem, setSendQuoteItem] = useState<Quote | null>(null);

  const [sortKey, setSortKey] = useState<'number' | 'customer' | 'total' | 'status'>('number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  function handleSort(key: 'number' | 'customer' | 'total' | 'status') {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return key;
    });
  }
  const customers = useMemo(() => {
    if (isSignedIn && dbCustomers?.rows) {
      return dbCustomers.rows.map(row => ({
        id: row.id,
        businessId: '',
        name: row.name,
        email: row.email || undefined,
        phone: undefined,
        address: row.address || undefined,
      }));
    }
    return store.customers;
  }, [isSignedIn, dbCustomers, store.customers]);

  const quotes = useMemo(() => {
    if (isSignedIn && dbQuotes?.rows) {
      return dbQuotes.rows.map(row => ({
        id: row.id,
        number: row.number,
        businessId: '',
        customerId: row.customerId,
        address: '',
        lineItems: [],
        taxRate: 0,
        discount: 0,
        subtotal: row.total,
        total: row.total,
        status: row.status,
        files: [],
        createdAt: row.updatedAt,
        updatedAt: row.updatedAt,
        publicToken: row.publicToken,
        viewCount: row.viewCount,
      }));
    }
    return store.quotes;
  }, [isSignedIn, dbQuotes, store.quotes]);

  const sortedQuotes = useMemo(() => {
    const arr = [...quotes];
    const baseCompare = (a: Quote, b: Quote) => {
      if (sortKey === 'number') return (a.number || '').localeCompare(b.number || '', undefined, { numeric: true, sensitivity: 'base' });
      if (sortKey === 'customer') return getCustomerName(a.customerId).localeCompare(getCustomerName(b.customerId));
      if (sortKey === 'total') return (a.total || 0) - (b.total || 0);
      return (a.status || '').localeCompare(b.status || '');
    };
    arr.sort((a, b) => (sortDir === 'asc' ? baseCompare(a, b) : -baseCompare(a, b)));
    return arr;
  }, [quotes, sortKey, sortDir, customers]);

  function getCustomerName(customerId: string): string {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
  }

  function getCustomerEmail(customerId: string): string | undefined {
    const customer = customers.find(c => c.id === customerId);
    return customer?.email;
  }

  function copyPublicLink(quote: Quote) {
    const url = `${window.location.origin}/quote/${quote.publicToken}`;
    navigator.clipboard.writeText(url);
    toast.success('Quote link copied to clipboard');
  }

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const newParam = params.get('new');
    if (newParam && (newParam === '1' || newParam.toLowerCase() === 'true')) {
      setOpen(true);
      navigate('/quotes', { replace: true });
    }
  }, [location.search, navigate]);


  return (
    <AppLayout title="Quotes">
      <section className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => { setOpen(true); }}>
            Create Quote
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button className="flex items-center gap-1" onClick={() => handleSort('number')} aria-label="Sort by number">
                      Number{sortKey === 'number' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1" onClick={() => handleSort('customer')} aria-label="Sort by customer">
                      Customer{sortKey === 'customer' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1" onClick={() => handleSort('total')} aria-label="Sort by total">
                      Total{sortKey === 'total' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1" onClick={() => handleSort('status')} aria-label="Sort by status">
                      Status{sortKey === 'status' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                    </button>
                  </TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No quotes yet. Create your first quote!
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedQuotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.number}</TableCell>
                      <TableCell>{getCustomerName(quote.customerId)}</TableCell>
                      <TableCell>{formatCurrency(quote.total)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[quote.status]}>
                          {quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSendQuoteItem(quote)}
                                  disabled={quote.status === 'Sent' || quote.status === 'Approved'}
                                >
                                  <Send className="h-4 w-4" />
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>Send Quote</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
  const existingJob = store.jobs.find((j) => j.quoteId === quote.id);
  if (existingJob) {
    toast.message('Job already exists for this quote', { description: 'Opening Work Orders...' });
    navigate('/work-orders');
    return;
  }
  try {
    const token = await getClerkTokenStrict(getToken);
    const r = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/jobs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteId: quote.id }),
    });
    if (!r.ok) throw new Error(await r.text());
    const data = await r.json();
    const j = data.job;
    store.upsertJob({
      id: j.id,
      customerId: j.customerId,
      quoteId: j.quoteId,
      address: j.address,
      startsAt: j.startsAt,
      endsAt: j.endsAt,
      status: j.status,
      total: j.total,
      createdAt: j.createdAt,
    });
    toast.success('Converted quote to job');
    navigate('/work-orders');
  } catch (e: any) {
    toast.error('Failed to create job', { description: e?.message || String(e) });
  }
}}
                              >
                                <Wrench className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Convert to Work Order</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={async () => {
  let jobId: string | undefined = store.jobs.find((j) => j.quoteId === quote.id)?.id;
  try {
    const token = await getClerkTokenStrict(getToken);
    if (!jobId) {
      const rJob = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/jobs`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteId: quote.id }),
      });
      if (!rJob.ok) throw new Error(await rJob.text());
      const jData = await rJob.json();
      const j = jData.job;
      store.upsertJob({
        id: j.id,
        customerId: j.customerId,
        quoteId: j.quoteId,
        address: j.address,
        startsAt: j.startsAt,
        endsAt: j.endsAt,
        status: j.status,
        total: j.total,
        createdAt: j.createdAt,
      });
      jobId = j.id;
      toast.success('Job created from quote');
    }

    if (jobId) {
      const rInv = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/invoices`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (!rInv.ok) throw new Error(await rInv.text());
      const iData = await rInv.json();
      const inv = iData.invoice;
      store.upsertInvoice({
        id: inv.id,
        number: inv.number,
        businessId: '',
        customerId: inv.customerId,
        jobId: inv.jobId,
        lineItems: [],
        taxRate: inv.taxRate,
        discount: inv.discount,
        subtotal: inv.subtotal,
        total: inv.total,
        status: inv.status,
        dueAt: inv.dueAt,
        createdAt: inv.createdAt,
        updatedAt: inv.updatedAt,
        publicToken: inv.publicToken,
      });
      toast.success('Invoice created');
      navigate('/invoices');
    }
  } catch (e: any) {
    toast.error('Failed to create invoice', { description: e?.message || String(e) });
  }
}}
                              >
                                <Receipt className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Create Invoice</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <CreateQuoteModal
        open={open}
        onOpenChange={setOpen}
        customers={customers as Customer[]}
        defaultTaxRate={store.business.taxRateDefault}
        onRequestSend={(q) => setSendQuoteItem(q)}
      />

      <SendQuoteModal
        open={!!sendQuoteItem}
        onOpenChange={(v) => { if (!v) setSendQuoteItem(null); }}
        quote={sendQuoteItem}
        toEmail={sendQuoteItem ? getCustomerEmail(sendQuoteItem.customerId) : undefined}
        customerName={sendQuoteItem ? getCustomerName(sendQuoteItem.customerId) : undefined}
      />
    </AppLayout>
  );
}
