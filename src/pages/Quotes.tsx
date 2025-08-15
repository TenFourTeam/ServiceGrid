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
import { useQuotesData, useCustomersData } from '@/queries/unified';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Receipt, Users } from 'lucide-react';
import { QuoteActions } from '@/components/Quotes/QuoteActions';

import { useOnboardingActions } from '@/onboarding/hooks';

import { toast } from 'sonner';
import { formatMoney as formatCurrency } from '@/utils/format';
import type { Customer, QuoteListItem, QuoteStatus, LineItem, Quote } from '@/types';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';


const statusColors: Record<QuoteStatus, string> = {
  'Draft': 'bg-gray-100 text-gray-800',
  'Sent': 'bg-blue-100 text-blue-800',
  'Viewed': 'bg-yellow-100 text-yellow-800',
  'Approved': 'bg-green-100 text-green-800',
  'Declined': 'bg-red-100 text-red-800',
  'Edits Requested': 'bg-orange-100 text-orange-800',
};


export default function QuotesPage() {
  const { isSignedIn, getToken } = useClerkAuth();
  const { businessTaxRateDefault } = useBusinessContext();
  const { data: quotes } = useQuotesData();
  const { data: customers } = useCustomersData();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const onboarding = useOnboardingActions();

  const [open, setOpen] = useState(false);
  const [sendQuoteItem, setSendQuoteItem] = useState<Quote | null>(null);

  const handleSendQuote = async (quoteListItem: QuoteListItem) => {
    // Convert QuoteListItem to full Quote by fetching from API
    try {
      const fullQuote = await edgeRequest(fn(`quotes?id=${quoteListItem.id}`), {
        method: 'GET',
      });
      setSendQuoteItem(fullQuote);
    } catch (error) {
      console.error('Failed to fetch full quote:', error);
      toast.error('Failed to load quote details');
    }
  };

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
  const sortedQuotes = useMemo(() => {
    const arr = [...quotes];
    const baseCompare = (a: QuoteListItem, b: QuoteListItem) => {
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

  function copyPublicLink(quote: QuoteListItem) {
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
      <section>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle>All Quotes</CardTitle>
            <Button onClick={() => { setOpen(true); }} data-onb="new-quote-button">
              Create Quote
            </Button>
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
                      <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-6">
                        <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                          <Receipt className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-2 max-w-md">
                          <h3 className="text-xl font-semibold">Ready to create your first quote?</h3>
                          <p className="text-muted-foreground">Send professional quotes to customers and convert them to jobs when approved. Get paid faster with integrated payment processing.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button onClick={() => setOpen(true)} className="gap-2">
                            <Receipt className="h-4 w-4" />
                            Create Your First Quote
                          </Button>
                          <Button variant="outline" onClick={onboarding.openAddCustomer} size="sm" className="gap-1">
                            <Users className="h-3 w-3" />
                            Add Customer First
                          </Button>
                        </div>
                      </div>
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
                        <QuoteActions 
                          quote={quote} 
                          onSendQuote={handleSendQuote}
                        />
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
        defaultTaxRate={businessTaxRateDefault || 0.1}
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
