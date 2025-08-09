import { useEffect, useMemo, useRef, useState } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/components/Auth/AuthProvider';
import { useSupabaseQuotes } from '@/hooks/useSupabaseQuotes';
import { useSupabaseCustomers } from '@/hooks/useSupabaseCustomers';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useAppStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Eye, Send, Download, Copy } from 'lucide-react';
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
  const { user: appUser } = useAuth();
  const store = useStore();
  const { data: dbQuotes } = useSupabaseQuotes({ enabled: !!appUser });
  const { data: dbCustomers } = useSupabaseCustomers({ enabled: !!appUser });
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<QuoteDraft>({
    customerId: '',
    address: '',
    lineItems: [],
    taxRate: 0.1,
    discount: 0,
    notesInternal: '',
    terms: '',
  });

  const lineItemIdCounter = useRef(1);

  const customers = useMemo(() => {
    if (appUser && dbCustomers?.rows) {
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
  }, [appUser, dbCustomers, store.customers]);

  const quotes = useMemo(() => {
    if (appUser && dbQuotes?.rows) {
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
  }, [appUser, dbQuotes, store.quotes]);

  function resetDraft() {
    setDraft({
      customerId: '',
      address: '',
      lineItems: [],
      taxRate: store.business.taxRateDefault,
      discount: 0,
      notesInternal: '',
      terms: '',
    });
    lineItemIdCounter.current = 1;
  }

  function addLineItem() {
    const newItem: LineItem = {
      id: `temp-${lineItemIdCounter.current++}`,
      name: '',
      qty: 1,
      unit: '',
      unitPrice: 0,
      lineTotal: 0,
    };
    setDraft(prev => ({
      ...prev,
      lineItems: [...prev.lineItems, newItem],
    }));
  }

  function updateLineItem(id: string, updates: Partial<LineItem>) {
    setDraft(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if ('qty' in updates || 'unitPrice' in updates) {
          updated.lineTotal = calculateLineTotal(updated.qty, updated.unitPrice);
        }
        return updated;
      }),
    }));
  }

  function removeLineItem(id: string) {
    setDraft(prev => ({
      ...prev,
      lineItems: prev.lineItems.filter(item => item.id !== id),
    }));
  }

  async function saveQuote() {
    if (!draft.customerId) {
      toast.error('Please select a customer');
      return;
    }
    if (draft.lineItems.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }

    setSaving(true);
    try {
      const { subtotal, total } = calculateQuoteTotals(draft.lineItems, draft.taxRate, draft.discount);
      
      const newQuote: Omit<Quote, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'publicToken'> = {
        businessId: store.business.id,
        customerId: draft.customerId,
        address: draft.address,
        lineItems: draft.lineItems,
        taxRate: draft.taxRate,
        discount: draft.discount,
        subtotal,
        total,
        status: 'Draft',
        files: [],
        notesInternal: draft.notesInternal,
        terms: draft.terms,
      };

      store.upsertQuote(newQuote);
      toast.success('Quote created successfully');
      setOpen(false);
      resetDraft();
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error('Failed to save quote');
    } finally {
      setSaving(false);
    }
  }

  function getCustomerName(customerId: string): string {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Unknown Customer';
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
      resetDraft();
      setOpen(true);
      navigate('/quotes', { replace: true });
    }
  }, [location.search, navigate]);

  const totals = useMemo(() => {
    return calculateQuoteTotals(draft.lineItems, draft.taxRate, draft.discount);
  }, [draft.lineItems, draft.taxRate, draft.discount]);

  return (
    <AppLayout title="Quotes">
      <section className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => { resetDraft(); setOpen(true); }}>
            New Quote
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
                            onClick={() => navigate(`/quote/${quote.publicToken}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyPublicLink(quote)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Quote</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <Select value={draft.customerId} onValueChange={(value) => setDraft(prev => ({ ...prev, customerId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Service Address</Label>
                <Input
                  id="address"
                  value={draft.address}
                  onChange={(e) => setDraft(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter service address"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Line Items *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {draft.lineItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No line items yet. Click "Add Item" to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {draft.lineItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                      <div className="col-span-4">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={item.name}
                          onChange={(e) => updateLineItem(item.id, { name: e.target.value })}
                          placeholder="Item description"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.qty}
                          onChange={(e) => updateLineItem(item.id, { qty: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Unit</Label>
                        <Input
                          value={item.unit || ''}
                          onChange={(e) => updateLineItem(item.id, { unit: e.target.value })}
                          placeholder="ea, hrs, etc."
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Unit Price</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice / 100}
                          onChange={(e) => updateLineItem(item.id, { unitPrice: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                        />
                      </div>
                      <div className="col-span-1">
                        <Label className="text-xs">Total</Label>
                        <div className="text-sm font-medium py-2">
                          {formatCurrency(item.lineTotal)}
                        </div>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                  <Input
                    id="tax-rate"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={draft.taxRate * 100}
                    onChange={(e) => setDraft(prev => ({ ...prev, taxRate: (parseFloat(e.target.value) || 0) / 100 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discount">Discount ($)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.discount / 100}
                    onChange={(e) => setDraft(prev => ({ ...prev, discount: Math.round((parseFloat(e.target.value) || 0) * 100) }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatCurrency(totals.taxAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-{formatCurrency(draft.discount)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={draft.notesInternal}
                  onChange={(e) => setDraft(prev => ({ ...prev, notesInternal: e.target.value }))}
                  placeholder="Internal notes (not visible to customer)"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="terms">Terms & Conditions</Label>
                <Textarea
                  id="terms"
                  value={draft.terms}
                  onChange={(e) => setDraft(prev => ({ ...prev, terms: e.target.value }))}
                  placeholder="Terms and conditions"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={saveQuote} disabled={saving}>
                {saving ? 'Creating...' : 'Create Quote'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
