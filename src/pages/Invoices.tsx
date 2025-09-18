
import AppLayout from '@/components/Layout/AppLayout';
import { useInvoicesData, useCustomersData } from '@/queries/unified';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatMoney } from '@/utils/format';
import { useEffect, useMemo, useState } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import InvoiceModal from '@/components/Invoices/InvoiceModal';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Send, Download } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import { useInvoicePayments } from '@/hooks/useInvoicePayments';
import { supabase } from '@/integrations/supabase/client';
import { invalidationHelpers } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { useAuth } from '@clerk/clerk-react';


export default function InvoicesPage() {
  const { data: customers = [] } = useCustomersData();
  const { data: invoices = [] } = useInvoicesData();
  const { isSignedIn } = useClerkAuth();
  const { businessId } = useBusinessContext();
  
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'All' | 'Draft' | 'Sent' | 'Paid' | 'Overdue'>('All');
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'send' | 'create'>('view');
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

    // We need auth context for the API calls
    const { getToken } = useAuth();
    const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));

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


  return (
    <AppLayout title="Invoices">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle>All Invoices</CardTitle>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Input
              placeholder="Search number or customer…"
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              className="w-full sm:w-48"
            />
            <Select value={status} onValueChange={(value: any) => setStatus(value)}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={sortedInvoices.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
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
                    <button className="flex items-center gap-1" onClick={() => requestSort('issued')} aria-label="Sort by issued date">
                      Issued{sortKey === 'issued' ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedInvoices.map((i)=> (
                <TableRow 
                  key={i.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedInvoice(i.id);
                    setModalMode('view');
                  }}
                >
                  <TableCell>{i.number}</TableCell>
                  <TableCell>{customers.find(c=>c.id===i.customerId)?.name}</TableCell>
                  <TableCell>{formatMoney(i.total)}</TableCell>
                  <TableCell>{formatDate(i.createdAt)}</TableCell>
                  <TableCell>{formatDate(i.dueAt)}</TableCell>
                  <TableCell>{i.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <InvoiceModal
        open={!!selectedInvoice}
        onOpenChange={(open) => { if (!open) setSelectedInvoice(null); }}
        invoice={formattedInvoices.find(inv => inv.id === selectedInvoice) || null}
        mode={modalMode}
      />
    </AppLayout>
  );
}
