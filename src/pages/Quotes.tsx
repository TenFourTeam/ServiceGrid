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
import { Trash2, Plus, Send, Download, Receipt, Wrench, Users, Calendar } from 'lucide-react';
import { AdvancedEmptyState } from '@/components/Onboarding/AdvancedEmptyState';
import { useOnboarding } from '@/components/Onboarding/OnboardingProvider';

import { toast } from 'sonner';
import { formatMoney as formatCurrency } from '@/utils/format';
import type { Customer, LineItem, Quote, QuoteStatus } from '@/types';
import { edgeFetchJson } from '@/utils/edgeApi';

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
  const { data: quotesData } = useSupabaseQuotes();
  const { data: customersData } = useSupabaseCustomers();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const onboarding = useOnboarding();

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
  // Use data directly from hooks
  const customers = customersData?.rows || [];
  const quotesRows = quotesData?.rows || [];
  
  // Transform quotes to match expected format
  const quotes = useMemo(() => {
    return quotesRows.map(row => ({
      id: row.id,
      number: row.number,
      customerId: row.customerId,
      total: row.total,
      status: row.status,
      updatedAt: row.updatedAt,
      viewCount: row.viewCount,
      publicToken: row.publicToken,
      // Add required fields with defaults
      businessId: '',
      lineItems: [] as any[],
      taxRate: 0,
      discount: 0,
      subtotal: row.total,
      address: '',
      createdAt: row.updatedAt
    }));
  }, [quotesRows]);

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
  }, [quotes, sortKey, sortDir]);

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
                    <TableCell colSpan={5} className="p-0">
                      <AdvancedEmptyState
                        icon={<Receipt className="h-8 w-8 text-blue-600" />}
                        title="Ready to create your first quote?"
                        description="Send professional quotes to customers and convert them to jobs when approved. Get paid faster with integrated payment processing."
                        actions={[
                          {
                            label: 'Create Your First Quote',
                            onClick: () => setOpen(true),
                            icon: <Receipt className="h-4 w-4" />,
                            badge: 'Start here',
                            description: 'Professional quotes in minutes'
                          }
                        ]}
                        secondaryActions={[
                          {
                            label: 'Add Customer First',
                            onClick: onboarding.openAddCustomer,
                            icon: <Users className="h-3 w-3" />
                          },
                          {
                            label: 'Schedule a Job',
                            onClick: onboarding.openNewJobSheet,
                            icon: <Calendar className="h-3 w-3" />
                          }
                        ]}
                      />
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
    const data = await edgeFetchJson(`jobs`, getToken, {
      method: 'POST',
      body: { quoteId: quote.id },
    });
    const j = (data as any).job || (data as any).row || data;
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
    if (!jobId) {
      const jData = await edgeFetchJson(`jobs`, getToken, {
        method: 'POST',
        body: { quoteId: quote.id },
      });
      const j = (jData as any).job || (jData as any).row || jData;
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
      const iData = await edgeFetchJson(`invoices`, getToken, {
        method: 'POST',
        body: { jobId },
      });
      const inv = (iData as any).invoice || iData;
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
