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
import { Trash2, Plus, Send, Download, FileText, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { formatMoney as formatCurrency } from '@/utils/format';
import type { Customer, LineItem, Quote, QuoteStatus } from '@/types';

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
  const { isSignedIn } = useClerkAuth();
  const store = useStore();
  const { data: dbQuotes } = useSupabaseQuotes({ enabled: !!isSignedIn });
  const { data: dbCustomers } = useSupabaseCustomers({ enabled: !!isSignedIn });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [sendQuoteItem, setSendQuoteItem] = useState<Quote | null>(null);

  

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
                  <TableHead>Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No quotes yet. Create your first quote!
                    </TableCell>
                  </TableRow>
                ) : (
                  quotes.map((quote) => (
                    <TableRow key={quote.id}>
                      <TableCell className="font-medium">{quote.number}</TableCell>
                      <TableCell>{getCustomerName(quote.customerId)}</TableCell>
                      <TableCell>{formatCurrency(quote.total)}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[quote.status]}>
                          {quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{quote.viewCount || 0}</TableCell>
                      <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSendQuoteItem(quote)}
                              title="Send Quote"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const existingJob = store.jobs.find((j) => j.quoteId === quote.id);
                                    let jobId: string | undefined = existingJob?.id;
                                    if (!jobId) {
                                      const jobs = store.convertQuoteToJob(quote.id);
                                      if (jobs && jobs.length > 0) {
                                        jobId = jobs[0].id;
                                        toast.success('Job created from quote');
                                      }
                                    }
                                    if (jobId) {
                                      const invoice = store.createInvoiceFromJob(jobId);
                                      if (invoice) {
                                        toast.success('Invoice created');
                                        navigate('/invoices');
                                      }
                                    }
                                  }}
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Create Invoice</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const existingJob = store.jobs.find((j) => j.quoteId === quote.id);
                                    if (existingJob) {
                                      toast.message('Job already exists for this quote', { description: 'Opening Work Orders...' });
                                      navigate('/work-orders');
                                      return;
                                    }
                                    const jobs = store.convertQuoteToJob(quote.id);
                                    if (jobs && jobs.length > 0) {
                                      toast.success('Converted quote to job');
                                      navigate('/work-orders');
                                    }
                                  }}
                                >
                                  <Briefcase className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Convert to Job</TooltipContent>
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
