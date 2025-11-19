import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { formatCurrencyInputNoSymbol, parseCurrencyInput, sanitizeMoneyTyping, formatMoney } from '@/utils/format';
import { useCustomersData } from '@/queries/unified';
import { CustomerCombobox } from '@/components/Quotes/CustomerCombobox';
import { LineItemsEditor } from '@/components/Quotes/LineItemsEditor';
import { CustomerBottomModal } from '@/components/Customers/CustomerBottomModal';
import { useQuoteCalculations } from '@/hooks/useQuoteCalculations';
import { InvoiceScanDialog } from './InvoiceScanDialog';
import { toast } from 'sonner';
import type { Invoice, Customer, LineItem, PaymentTerms, QuoteFrequency } from '@/types';
import type { ExtractedInvoiceData } from '@/hooks/useInvoiceExtraction';
import type { JobEstimate } from '@/hooks/useJobEstimation';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ChevronDown, Sparkles } from 'lucide-react';

export interface InvoiceFormData {
  customerId: string;
  address?: string;
  lineItems: LineItem[];
  taxRate: number;
  discount: number;
  paymentTerms?: PaymentTerms;
  frequency?: QuoteFrequency;
  depositRequired: boolean;
  depositPercent?: number;
  notesInternal?: string;
  terms?: string;
  dueDate?: Date;
}

export interface InvoiceFormProps {
  customers: Customer[];
  onSubmit: (data: InvoiceFormData) => void;
  onCancel: () => void;
  initialData?: Partial<InvoiceFormData>;
  mode: 'create' | 'edit';
  loading?: boolean;
  businessTaxRateDefault?: number;
  onEstimateExtracted?: (estimate: JobEstimate) => void;
  jobId?: string;
}

export function InvoiceForm({
  customers,
  onSubmit,
  onCancel,
  initialData,
  mode,
  loading = false,
  businessTaxRateDefault = 0.1,
  onEstimateExtracted,
  jobId
}: InvoiceFormProps) {
  // Form state
  const [customerId, setCustomerId] = useState(initialData?.customerId || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [lineItems, setLineItems] = useState<LineItem[]>(initialData?.lineItems || []);
  const [taxRateInput, setTaxRateInput] = useState((initialData?.taxRate || businessTaxRateDefault) * 100);
  const [discountInput, setDiscountInput] = useState('0.00');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms | undefined>(initialData?.paymentTerms);
  const [frequency, setFrequency] = useState<QuoteFrequency | undefined>(initialData?.frequency);
  const [depositRequired, setDepositRequired] = useState(initialData?.depositRequired || false);
  const [depositPercent, setDepositPercent] = useState(initialData?.depositPercent || 50);
  const [notesInternal, setNotesInternal] = useState(initialData?.notesInternal || '');
  const [terms, setTerms] = useState(initialData?.terms || '');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    initialData?.dueDate ? new Date(initialData.dueDate) : undefined
  );
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [scanMode, setScanMode] = useState<'receipt' | 'photo'>('receipt');
  const [estimateConfidence, setEstimateConfidence] = useState<'high' | 'medium' | 'low' | null>(null);

  // Initialize discount display
  useEffect(() => {
    if (initialData?.discount !== undefined) {
      setDiscountInput(formatCurrencyInputNoSymbol(initialData.discount));
    }
  }, [initialData?.discount]);

  // Calculate totals
  const taxRate = taxRateInput / 100;
  const discount = parseCurrencyInput(discountInput);
  
  const { subtotal, taxAmount, total } = useQuoteCalculations(lineItems, taxRate, discount);

  // Auto-populate address from selected customer
  useEffect(() => {
    if (customerId && !address && mode === 'create') {
      const customer = customers.find(c => c.id === customerId);
      if (customer?.address) {
        setAddress(customer.address);
      }
    }
  }, [customerId, customers, address, mode]);

  const addLineItem = useCallback(() => {
    const newItem: LineItem = {
      id: `temp-${Date.now()}`, // Temporary ID for new items
      name: '',
      qty: 1,
      unitPrice: 0,
      lineTotal: 0
    };
    setLineItems(prev => [...prev, newItem]);
  }, []);

  const updateLineItem = useCallback((id: string, updates: Partial<LineItem>) => {
    setLineItems(prev => prev.map(item => 
      item.id === id
        ? { 
            ...item, 
            ...updates,
            lineTotal: updates.lineTotal || (updates.qty || item.qty) * (updates.unitPrice || item.unitPrice)
          }
        : item
    ));
  }, []);

  const removeLineItem = useCallback((id: string) => {
    setLineItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customerId.trim()) {
      return;
    }

    onSubmit({
      customerId: customerId.trim(),
      address: address.trim() || undefined,
      lineItems,
      taxRate,
      discount,
      paymentTerms,
      frequency,
      depositRequired,
      depositPercent: depositRequired ? depositPercent : undefined,
      notesInternal: notesInternal.trim() || undefined,
      terms: terms.trim() || undefined,
      dueDate
    });
  };

  const handleEstimateExtracted = (estimate: JobEstimate) => {
    // Convert estimate line items to form line items
    const newLineItems: LineItem[] = estimate.lineItems.map(item => ({
      id: item.id,
      name: item.name,
      qty: item.quantity,
      unitPrice: item.unit_price,
      unit: item.unit,
      lineTotal: item.quantity * item.unit_price,
      notes: item.notes
    }));

    setLineItems(newLineItems);
    setNotesInternal(estimate.workDescription + (estimate.additionalNotes ? '\n\n' + estimate.additionalNotes : ''));
    setEstimateConfidence(estimate.confidence);
    setShowScanDialog(false);
    
    toast.success('AI estimate applied - please review and adjust as needed');
    
    if (onEstimateExtracted) {
      onEstimateExtracted(estimate);
    }
  };

  const handleDataExtracted = (data: ExtractedInvoiceData) => {
    // Pre-populate form with extracted data
    if (data.lineItems && data.lineItems.length > 0) {
      const formattedLineItems: LineItem[] = data.lineItems.map(item => ({
        id: crypto.randomUUID(),
        name: item.description,
        qty: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.total,
        unit: 'ea'
      }));
      setLineItems(formattedLineItems);
    }

    if (data.taxRate !== undefined) {
      setTaxRateInput(data.taxRate * 100);
    }

    // Add vendor and invoice number to internal notes
    if (data.vendor || data.invoiceNumber || data.date) {
      const notesParts = [];
      if (data.vendor) notesParts.push(`Vendor: ${data.vendor}`);
      if (data.invoiceNumber) notesParts.push(`Invoice #: ${data.invoiceNumber}`);
      if (data.date) notesParts.push(`Date: ${data.date}`);
      setNotesInternal(notesParts.join('\n') + (notesInternal ? '\n\n' + notesInternal : ''));
    }

    toast.success('Invoice data extracted! Please review and adjust as needed.');
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg">Customer Information</CardTitle>
                {mode === 'create' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="sm" className="gap-2">
                        <Camera className="h-4 w-4" />
                        Scan
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setScanMode('receipt'); setShowScanDialog(true); }}>
                        <Camera className="h-4 w-4 mr-2" />
                        Scan Vendor Receipt
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => { setScanMode('photo'); setShowScanDialog(true); }}>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Estimate from Photo
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Customer *</Label>
                <CustomerCombobox
                  customers={customers}
                  value={customerId}
                  onChange={setCustomerId}
                  onCreateCustomer={() => setShowCustomerModal(true)}
                  placeholder="Select customer..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Service address..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                {estimateConfidence && (
                  <Badge 
                    variant={estimateConfidence === 'high' ? 'default' : estimateConfidence === 'medium' ? 'secondary' : 'outline'}
                    className="gap-1"
                  >
                    <Sparkles className="h-3 w-3" />
                    AI Estimated ({estimateConfidence} confidence)
                  </Badge>
                )}
              </div>
              {estimateConfidence && (
                <p className="text-sm text-muted-foreground mt-1">
                  Please review AI suggestions and adjust as needed
                </p>
              )}
            </CardHeader>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Terms & Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select value={paymentTerms || "none"} onValueChange={(value) => setPaymentTerms(value === "none" ? undefined : value as PaymentTerms)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select terms..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="due_on_receipt">Due on Receipt</SelectItem>
                      <SelectItem value="net_15">Net 15</SelectItem>
                      <SelectItem value="net_30">Net 30</SelectItem>
                      <SelectItem value="net_60">Net 60</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={frequency || "none"} onValueChange={(value) => setFrequency(value === "none" ? undefined : value as QuoteFrequency)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="one-off">One-off</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="bi-monthly">Bi-monthly</SelectItem>
                      <SelectItem value="bi-yearly">Bi-yearly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dueDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dueDate ? format(dueDate, "PPP") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dueDate}
                      onSelect={setDueDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <LineItemsEditor
              items={lineItems}
              onAdd={addLineItem}
              onUpdate={updateLineItem}
              onRemove={removeLineItem}
            />
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={taxRateInput}
                  onChange={(e) => setTaxRateInput(parseFloat(e.target.value) || 0)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">Discount</Label>
                <Input
                  id="discount"
                  type="text"
                  value={discountInput}
                  onChange={(e) => {
                    const sanitized = sanitizeMoneyTyping(e.target.value);
                    setDiscountInput(sanitized);
                  }}
                  onBlur={() => {
                    setDiscountInput(formatCurrencyInputNoSymbol(discount));
                  }}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Deposit Section */}
            <div className="space-y-3 p-4 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="depositRequired"
                  checked={depositRequired}
                  onCheckedChange={(checked) => setDepositRequired(!!checked)}
                />
                <Label htmlFor="depositRequired" className="text-sm font-medium">
                  Deposit Required
                </Label>
              </div>

              {depositRequired && (
                <div className="space-y-2">
                  <Label htmlFor="depositPercent">Deposit Percentage (%)</Label>
                  <Input
                    id="depositPercent"
                    type="number"
                    min="1"
                    max="100"
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(parseInt(e.target.value) || 50)}
                  />
                </div>
              )}
            </div>

            {/* Totals Summary */}
            <div className="bg-muted/30 p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>{formatMoney(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Discount:</span>
                <span>-{formatMoney(discount)}</span>
              </div>
              <div className="flex justify-between font-semibold text-base border-t pt-2">
                <span>Total:</span>
                <span>{formatMoney(total)}</span>
              </div>
              {depositRequired && (
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Deposit ({depositPercent}%):</span>
                  <span>{formatMoney(total * (depositPercent / 100))}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Notes & Terms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Internal Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notesInternal}
                onChange={(e) => setNotesInternal(e.target.value)}
                placeholder="Internal notes (not visible to customer)..."
                rows={4}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="Terms and conditions..."
                rows={4}
              />
            </CardContent>
          </Card>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !customerId.trim()}>
            {loading ? 'Saving...' : mode === 'create' ? 'Create Invoice' : 'Update Invoice'}
          </Button>
        </div>
      </form>

      <CustomerBottomModal
        open={showCustomerModal}
        onOpenChange={setShowCustomerModal}
        onCustomerCreated={(customer) => {
          setCustomerId(customer.id);
          setShowCustomerModal(false);
        }}
      />

      <InvoiceScanDialog
        open={showScanDialog}
        onOpenChange={setShowScanDialog}
        onDataExtracted={handleDataExtracted}
        onEstimateExtracted={handleEstimateExtracted}
        mode={scanMode}
        jobId={jobId}
      />
    </>
  );
}