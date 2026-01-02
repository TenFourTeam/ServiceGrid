
import AppLayout from '@/components/Layout/AppLayout';
import { useInvoicesData, useCustomersData } from '@/queries/unified';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDate, formatMoney } from '@/utils/format';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from "@/hooks/use-mobile";
import InvoiceModal from '@/components/Invoices/InvoiceModal';
import { InvoiceActions } from '@/components/Invoices/InvoiceActions';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Send, Download } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { useInvoicePayments } from '@/hooks/useInvoicePayments';
import { supabase } from '@/integrations/supabase/client';
import { invalidationHelpers } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useLanguage } from '@/contexts/LanguageContext';
import RecurringBillingTab from '@/components/Invoices/RecurringBillingTab';
import { useRecurringSchedules } from '@/hooks/useRecurringSchedules';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  'Draft': 'bg-gray-100 text-gray-800',
  'Sent': 'bg-blue-100 text-blue-800', 
  'Paid': 'bg-green-100 text-green-800',
  'Overdue': 'bg-red-100 text-red-800'
};

export default function InvoicesPage() {
  const { data: customers = [] } = useCustomersData();
  const { data: invoices = [] } = useInvoicesData();
  const { data: recurringSchedules = [] } = useRecurringSchedules();
  const { isSignedIn } = useAuth();
  const { businessId } = useBusinessContext();
  const { t } = useLanguage();
  const authApi = useAuthApi();
  
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'All' | 'Draft' | 'Sent' | 'Paid' | 'Overdue'>('All');
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'send' | 'create' | 'mark_paid'>('view');
  const [sortKey, setSortKey] = useState<'number' | 'issued' | 'customer' | 'amount' | 'due' | 'status'>('number');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const qc = useQueryClient();
  
  useEffect(() => {
    if (!isSignedIn) return;
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        if (businessId) {
          invalidationHelpers.invoices(qc, businessId);
          qc.refetchQueries({ queryKey: ['data', 'invoices', businessId] });
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoice_line_items' }, () => {
        if (businessId) {
          invalidationHelpers.invoices(qc, businessId);
          qc.refetchQueries({ queryKey: ['data', 'invoices', businessId] });
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc, isSignedIn, businessId]);

  // Convert unified data to expected format
  const formattedInvoices = useMemo(() => {
    return invoices.map(row => ({
      id: row.id,
      number: row.number,
      businessId: '',
      customerId: row.customerId,
      jobId: row.jobId || undefined,
      quoteId: row.quoteId || undefined,
      recurringScheduleId: row.recurringScheduleId || undefined,
      lineItems: [] as any[],
      taxRate: row.taxRate ?? 0,
      discount: row.discount,
      subtotal: row.subtotal,
      total: row.total,
      status: row.status as any,
      dueAt: row.dueAt || undefined,
      createdAt: row.createdAt || new Date().toISOString(),
      updatedAt: row.updatedAt || new Date().toISOString(),
      publicToken: row.publicToken || '',
    }));
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    let list = formattedInvoices.slice();
    if (status !== 'All') list = list.filter(i => i.status === status);
    const query = q.trim().toLowerCase();
    if (query) {
      list = list.filter(i => i.number.toLowerCase().includes(query) || ((customers.find(c=>c.id===i.customerId)?.name?.toLowerCase().includes(query)) ?? false));
    }
    return list;
  }, [formattedInvoices, status, q, customers]);

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
        case 'issued':
          va = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          vb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
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

  const handleExportCSV = async () => {
    if (sortedInvoices.length === 0) return;

    // Fetch payment data for all paid invoices
    const paymentPromises = sortedInvoices
      .filter(invoice => invoice.status === 'Paid')
      .map(async invoice => {
        try {
          const { data } = await authApi.invoke('invoices-crud', {
            method: 'GET',
            queryParams: { 
              action: 'get_payments',
              invoiceId: invoice.id 
            }
          });
          return { invoiceId: invoice.id, payments: data?.payments || [] };
        } catch (error) {
          console.error('Error fetching payments for invoice', invoice.id, error);
          return { invoiceId: invoice.id, payments: [] };
        }
      });

    const paymentResults = await Promise.all(paymentPromises);
    const paymentsMap = paymentResults.reduce((acc, result) => {
      acc[result.invoiceId] = result.payments;
      return acc;
    }, {} as Record<string, any[]>);

    const csvData = sortedInvoices.map(invoice => {
      const customer = customers.find(c => c.id === invoice.customerId);
      const payments = paymentsMap[invoice.id] || [];
      const mostRecentPayment = payments.length > 0 ? payments[0] : null;
      const paymentType = mostRecentPayment ? mostRecentPayment.method : 'N/A';

      return {
        'Invoice Number': invoice.number,
        'Customer Name': customer?.name || 'Unknown',
        'Customer Email': customer?.email || '',
        'Amount': formatMoney(invoice.total),
        'Status': invoice.status,
        'Payment Type': paymentType,
        'Issued Date': formatDate(invoice.createdAt),
        'Due Date': formatDate(invoice.dueAt),
        'Paid Date': invoice.status === 'Paid' ? formatDate(invoice.paidAt) : '',
        'Subtotal': formatMoney(invoice.subtotal),
        'Tax Rate': `${invoice.taxRate ?? 0}%`,
        'Discount': formatMoney(invoice.discount),
      };
    });

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handler functions for invoice actions
  const handleEditInvoice = (invoice: any) => {
    setSelectedInvoice(invoice.id);
    setModalMode('edit');
  };

  const handleMarkAsPaid = (invoice: any) => {
    setSelectedInvoice(invoice.id);
    setModalMode('mark_paid');
  };

  const handleEmailPreview = (invoice: any) => {
    setSelectedInvoice(invoice.id);
    setModalMode('send');
  };

  // Invoice Card component for mobile view
  function InvoiceCard({ invoice, onClick }: { invoice: any; onClick: () => void }) {
    const customer = customers.find(c => c.id === invoice.customerId);
    const isRecurring = !!invoice.recurringScheduleId;
    return (
      <div 
        onClick={onClick}
        className="relative p-4 border rounded-md bg-card shadow-sm cursor-pointer hover:bg-accent/30 transition-colors"
      >
        {/* Recurring icon in top-left corner */}
        {isRecurring && (
          <div className="absolute top-2 left-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-lg">🔁</span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generated from recurring billing</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
        
        {/* Status badge in top-right corner */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className={statusColors[invoice.status] || 'bg-gray-100 text-gray-800'}>
            {invoice.status}
          </Badge>
          {isRecurring && (
            <Badge variant="outline" className="ml-1 text-xs">
              Recurring
            </Badge>
          )}
        </div>

        {/* Actions menu halfway up right edge */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
          <InvoiceActions
            invoice={invoice}
            onEditInvoice={handleEditInvoice}
            onMarkAsPaid={handleMarkAsPaid}
            onEmailPreview={handleEmailPreview}
            onInvoiceDeleted={() => {
              // Refresh data after deletion
              invalidationHelpers.invoices(qc, businessId || '');
            }}
          />
        </div>

        {/* Content area with right padding */}
        <div className={cn("pr-20 pb-8", isRecurring && "pl-8")}>
          <div className="space-y-1">
            <div className="font-medium">#{invoice.number}</div>
            <div className="text-sm text-muted-foreground">
              {t('invoices.mobile.customer')}: {customer?.name || 'Unknown'}
            </div>
            {customer?.address && (
              <div className="text-xs text-muted-foreground">
                {customer.address}
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              {formatMoney(invoice.total)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(invoice.updatedAt), { addSuffix: true })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isMobile = useIsMobile();


  return (
    <AppLayout title={t('invoices.title')}>
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>{t('invoices.title')}</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              onClick={() => {
                setSelectedInvoice(null);
                setModalMode('create');
              }}
              size="sm"
              className="w-full sm:w-auto"
            >
              Create Invoice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={sortedInvoices.length === 0}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('invoices.exportCSV')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">
                All Invoices
                <Badge variant="secondary" className="ml-2">
                  {sortedInvoices.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="recurring">
                Recurring Billing
                <Badge variant="secondary" className="ml-2">
                  {recurringSchedules.length}
                </Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-2">
                <Input
                  placeholder={t('invoices.searchPlaceholder')}
                  value={q}
                  onChange={(e)=>setQ(e.target.value)}
                  className="w-full sm:w-48"
                />
                <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">{t('invoices.status.all')}</SelectItem>
                    <SelectItem value="Draft">{t('invoices.status.draft')}</SelectItem>
                    <SelectItem value="Sent">{t('invoices.status.sent')}</SelectItem>
                    <SelectItem value="Paid">{t('invoices.status.paid')}</SelectItem>
                    <SelectItem value="Overdue">{t('invoices.status.overdue')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isMobile ? (
                // Mobile/Tablet Card View
                <div className="space-y-3">
                  {sortedInvoices.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground text-lg">{t('invoices.noInvoicesFound')}</p>
                    </div>
                  ) : (
                    sortedInvoices.map((i) => (
                      <InvoiceCard
                        key={i.id}
                        invoice={i}
                        onClick={() => {
                          setSelectedInvoice(i.id);
                          setModalMode('view');
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
                          <button className="flex items-center gap-1" onClick={() => requestSort('number')} aria-label="Sort by number">
                            {t('invoices.table.number')}{sortKey === 'number' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                      </TableHead>
                      <TableHead>
                          <button className="flex items-center gap-1" onClick={() => requestSort('customer')} aria-label="Sort by customer">
                            {t('invoices.table.customer')}{sortKey === 'customer' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                      </TableHead>
                      <TableHead>
                          <button className="flex items-center gap-1" onClick={() => requestSort('amount')} aria-label="Sort by amount">
                            {t('invoices.table.amount')}{sortKey === 'amount' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                      </TableHead>
                      <TableHead>
                          <button className="flex items-center gap-1" onClick={() => requestSort('issued')} aria-label="Sort by issued date">
                            {t('invoices.table.issued')}{sortKey === 'issued' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                      </TableHead>
                      <TableHead>
                          <button className="flex items-center gap-1" onClick={() => requestSort('due')} aria-label="Sort by due date">
                            {t('invoices.table.due')}{sortKey === 'due' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                      </TableHead>
                      <TableHead>
                          <button className="flex items-center gap-1" onClick={() => requestSort('status')} aria-label="Sort by status">
                             {t('invoices.table.status')}{sortKey === 'status' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                          </button>
                      </TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedInvoices.map((i)=> {
                      const isRecurring = !!(i as any).recurringScheduleId;
                      return (
                        <TableRow 
                          key={i.id} 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => {
                            setSelectedInvoice(i.id);
                            setModalMode('view');
                          }}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {isRecurring && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-base">🔁</span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Generated from recurring billing</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {i.number}
                            </div>
                          </TableCell>
                        <TableCell>{customers.find(c=>c.id===i.customerId)?.name}</TableCell>
                        <TableCell>{formatMoney(i.total)}</TableCell>
                        <TableCell>{formatDate(i.createdAt)}</TableCell>
                        <TableCell>{formatDate(i.dueAt)}</TableCell>
                        <TableCell>{i.status}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <InvoiceActions
                            invoice={i}
                            onEditInvoice={handleEditInvoice}
                            onMarkAsPaid={handleMarkAsPaid}
                            onEmailPreview={handleEmailPreview}
                            onInvoiceDeleted={() => {
                              // Refresh data after deletion
                              invalidationHelpers.invoices(qc, businessId || '');
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="recurring">
              <RecurringBillingTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <InvoiceModal
        open={!!selectedInvoice || modalMode === 'create'}
        onOpenChange={(open) => { 
          if (!open) {
            setSelectedInvoice(null);
            setModalMode('view');
          }
        }}
        invoice={formattedInvoices.find(inv => inv.id === selectedInvoice) || null}
        mode={modalMode}
      />
    </AppLayout>
  );
}
