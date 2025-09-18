import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { QuoteDetailsModal } from '@/components/Quotes/QuoteDetailsModal';
import QuoteErrorBoundary from '@/components/ErrorBoundaries/QuoteErrorBoundary';

import { useOnboardingActions } from '@/onboarding/hooks';

import { toast } from 'sonner';
import { formatMoney as formatCurrency } from '@/utils/format';
import type { Customer, QuoteListItem, QuoteStatus, LineItem, Quote } from '@/types';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';


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
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const { businessTaxRateDefault } = useBusinessContext();
  const { data: quotes } = useQuotesData();
  const { data: customers } = useCustomersData();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const onboarding = useOnboardingActions();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [sendQuoteItem, setSendQuoteItem] = useState<Quote | null>(null);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const [detailsModalMode, setDetailsModalMode] = useState<'create' | 'view' | 'edit'>('view');
  const [highlightedQuoteId, setHighlightedQuoteId] = useState<string | null>(null);

  const handleSendQuote = async (quoteListItem: QuoteListItem) => {
    // Convert QuoteListItem to full Quote by fetching from API
    try {
      const { data: fullQuote, error } = await authApi.invoke(`quotes?id=${quoteListItem.id}`, {
        method: 'GET'
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to load quote details');
      }
      
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
    const highlightParam = params.get('highlight');
    const newQuoteParam = params.get('newQuote');
    
    if (newParam && (newParam === '1' || newParam.toLowerCase() === 'true')) {
      setCreateModalOpen(true);
      setDetailsModalMode('create');
      navigate('/quotes', { replace: true });
    }
    
    if (highlightParam) {
      setSelectedQuoteId(highlightParam);
      setDetailsModalMode('view');
      // Clean up URL without the highlight parameter
      const newParams = new URLSearchParams(location.search);
      newParams.delete('highlight');
      const newSearch = newParams.toString();
      navigate(`/quotes${newSearch ? `?${newSearch}` : ''}`, { replace: true });
    }

    if (newQuoteParam) {
      console.log('[Quotes] Highlighting new quote:', newQuoteParam);
      setHighlightedQuoteId(newQuoteParam);
      
      // Scroll to the highlighted quote after a longer delay to ensure data has loaded
      setTimeout(() => {
        const quoteRow = document.querySelector(`[data-quote-id="${newQuoteParam}"]`);
        console.log('[Quotes] Found quote row for scrolling:', !!quoteRow);
        if (quoteRow) {
          quoteRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);
      
      // Auto-remove highlight after longer duration
      setTimeout(() => {
        console.log('[Quotes] Removing highlight');
        setHighlightedQuoteId(null);
      }, 6000);
      
      // Clean up URL after a short delay
      setTimeout(() => {
        navigate('/quotes', { replace: true });
      }, 1000);
    }
  }, [location.search, navigate]);

  // Quote Card component for mobile view
  function QuoteCard({ quote, onClick }: { quote: QuoteListItem; onClick: () => void }) {
    return (
      <div 
        onClick={onClick}
        className={`p-4 border rounded-md bg-card shadow-sm cursor-pointer hover:bg-accent/30 transition-all duration-500 ${
          highlightedQuoteId === quote.id 
            ? 'animate-bounce bg-success/20 border-l-4 border-l-success scale-[1.03] shadow-xl ring-2 ring-success/30' 
            : ''
        }`}
        data-quote-id={quote.id}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-medium truncate">#{quote.number}</div>
              <div className="text-sm text-muted-foreground">{formatCurrency(quote.total)}</div>
            </div>
            <div className="text-sm text-muted-foreground truncate">
              Customer: {getCustomerName(quote.customerId)}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className={statusColors[quote.status]}>
              {quote.status}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  const isMobile = useIsMobile();


  return (
    <AppLayout title="Quotes">
      <QuoteErrorBoundary>
        <section>
          <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle>All Quotes</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button onClick={() => {
                setCreateModalOpen(true);
                setDetailsModalMode('create');
                setSelectedQuoteId(null);
              }} data-onb="new-quote-button" className="w-full sm:w-auto">
                Create Quote
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              // Mobile/Tablet Card View
              <div className="space-y-3">
                {quotes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-6">
                    <div className="h-16 w-16 mx-auto rounded-full bg-muted flex items-center justify-center">
                      <Receipt className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="space-y-2 max-w-md">
                      <h3 className="text-xl font-semibold">Ready to create your first quote?</h3>
                      <p className="text-muted-foreground">Send professional quotes to customers and convert them to jobs when approved. Get paid faster with integrated payment processing.</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button onClick={() => {
                        setCreateModalOpen(true);
                        setDetailsModalMode('create');
                        setSelectedQuoteId(null);
                      }} className="gap-2">
                        <Receipt className="h-4 w-4" />
                        Create Your First Quote
                      </Button>
                      <Button variant="outline" onClick={onboarding.openAddCustomer} size="sm" className="gap-1">
                        <Users className="h-3 w-3" />
                        Add Customer First
                      </Button>
                    </div>
                  </div>
                ) : (
                  sortedQuotes.map((quote) => (
                    <QuoteCard
                      key={quote.id}
                      quote={quote}
                      onClick={() => {
                        setSelectedQuoteId(quote.id);
                        setDetailsModalMode('view');
                      }}
                    />
                  ))
                )}
              </div>
            ) : (
              // Desktop Table View
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
                            <Button onClick={() => {
                              setCreateModalOpen(true);
                              setDetailsModalMode('create');
                              setSelectedQuoteId(null);
                            }} className="gap-2">
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
                    <TableRow 
                      key={quote.id}
                      data-quote-id={quote.id}
                      className={`cursor-pointer hover:bg-muted/50 transition-all duration-500 ${
                        highlightedQuoteId === quote.id 
                          ? 'animate-bounce bg-success/20 border-l-4 border-l-success scale-[1.03] shadow-xl ring-2 ring-success/30' 
                          : ''
                      }`}
                      onClick={() => {
                        setSelectedQuoteId(quote.id);
                        setDetailsModalMode('view');
                      }}
                    >
                        <TableCell className="font-medium">{quote.number}</TableCell>
                        <TableCell>{getCustomerName(quote.customerId)}</TableCell>
                        <TableCell>{formatCurrency(quote.total)}</TableCell>
                        <TableCell>
                          <Badge className={statusColors[quote.status]}>
                            {quote.status}
                          </Badge>
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
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
            )}
          </CardContent>
        </Card>
      </section>

      <SendQuoteModal
        open={!!sendQuoteItem}
        onOpenChange={(v) => { if (!v) setSendQuoteItem(null); }}
        quote={sendQuoteItem}
        toEmail={sendQuoteItem ? getCustomerEmail(sendQuoteItem.customerId) : undefined}
        customerName={sendQuoteItem ? getCustomerName(sendQuoteItem.customerId) : undefined}
      />

      <QuoteDetailsModal
        open={createModalOpen || !!selectedQuoteId}
        onOpenChange={(open) => {
          if (!open) {
            setCreateModalOpen(false);
            setSelectedQuoteId(null);
          }
        }}
        quoteId={selectedQuoteId}
        onSendQuote={setSendQuoteItem}
        mode={detailsModalMode}
        defaultTaxRate={businessTaxRateDefault || 0.1}
      />
      </QuoteErrorBoundary>
    </AppLayout>
  );
}
