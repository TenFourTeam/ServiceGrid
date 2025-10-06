import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { CustomerCombobox } from '@/components/Quotes/CustomerCombobox';
import { LineItemsEditor } from '@/components/Quotes/LineItemsEditor';
import { CustomerBottomModal } from '@/components/Customers/CustomerBottomModal';
import { useQuoteCalculations } from '@/hooks/useQuoteCalculations';
import { useSessionStorage } from '@/hooks/useSessionStorage';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { formatCurrencyInputNoSymbol, parseCurrencyInput, sanitizeMoneyTyping } from '@/utils/format';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Customer, LineItem, Quote } from '@/types';

interface QuoteFormData {
  customerId: string;
  address: string;
  lineItems: LineItem[];
  taxRate: number;
  discount: number;
  notesInternal: string;
  terms: string;
  paymentTerms: 'due_on_receipt' | 'net_15' | 'net_30' | 'net_60';
  frequency: 'one-off' | 'bi-monthly' | 'monthly' | 'bi-yearly' | 'yearly';
  depositRequired: boolean;
  depositPercent: number;
  isSubscription: boolean;
}

interface QuoteFormProps {
  customers: Customer[];
  defaultTaxRate: number;
  onSubmit: (data: QuoteFormData) => void;
  onCancel: () => void;
  disabled?: boolean;
  initialData?: Quote;
  mode?: 'create' | 'view' | 'edit';
}

export function QuoteForm({ customers, defaultTaxRate, onSubmit, onCancel, disabled, initialData, mode = 'create' }: QuoteFormProps) {
  const { t } = useLanguage();
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Only use session storage for new quote creation
  const storageKey = mode === 'create' ? 'quote-draft-new' : null;
  
  const [data, setData] = useState<QuoteFormData>({
    customerId: '',
    address: '',
    lineItems: [],
    taxRate: defaultTaxRate,
    discount: 0,
    notesInternal: '',
    terms: '',
    paymentTerms: 'due_on_receipt',
    frequency: 'one-off',
    depositRequired: false,
    depositPercent: 0,
    isSubscription: false,
  });

  // Session storage for draft persistence (only used in create mode)
  const [storedData, setStoredData, removeStoredData] = useSessionStorage<QuoteFormData | null>(
    storageKey || 'quote-no-storage',
    null
  );
  
  // Debounced value for auto-saving
  const debouncedData = useDebouncedValue(data, 1000);

  // Populate form with initial data when provided or restore from storage
  useEffect(() => {
    if (initialData) {
      // Always use initialData for existing quotes
      setData({
        customerId: initialData.customerId || '',
        address: initialData.address || '',
        lineItems: initialData.lineItems || [],
        taxRate: initialData.taxRate || defaultTaxRate,
        discount: initialData.discount || 0,
        notesInternal: initialData.notesInternal || '',
        terms: initialData.terms || '',
        paymentTerms: initialData.paymentTerms || 'due_on_receipt',
        frequency: initialData.frequency || 'one-off',
        depositRequired: initialData.depositRequired || false,
        depositPercent: initialData.depositPercent || 0,
        isSubscription: initialData.isSubscription || false,
      });
      setDiscountInput(formatCurrencyInputNoSymbol(initialData.discount || 0));
    } else if (storedData && mode === 'create' && storageKey) {
      // Only restore from storage in create mode
      setData(storedData);
      setDiscountInput(formatCurrencyInputNoSymbol(storedData.discount || 0));
    }
  }, [initialData, defaultTaxRate, mode, storageKey]);

  // Auto-save to session storage when data changes (only for new quotes)
  useEffect(() => {
    if (mode === 'create' && storageKey && debouncedData && (debouncedData.customerId || debouncedData.lineItems.length > 0)) {
      setStoredData(debouncedData);
      setLastSaved(new Date());
    }
  }, [debouncedData, mode, storageKey, setStoredData]);

  // Auto-populate address when customer changes
  useEffect(() => {
    if (data.customerId && customers.length > 0) {
      const selectedCustomer = customers.find(c => c.id === data.customerId);
      // Always update address when customer changes (if customer has address)
      if (selectedCustomer?.address) {
        setData(prev => ({ ...prev, address: selectedCustomer.address || '' }));
      }
    }
  }, [data.customerId]);

  const [discountInput, setDiscountInput] = useState('');
  const lineItemIdCounter = useState(() => ({ current: 1 }))[0];

  const totals = useQuoteCalculations(data.lineItems, data.taxRate, data.discount);

  const isValid = mode === 'edit' 
    ? data.customerId // Less strict for edit mode - just need customer
    : data.customerId && data.lineItems.some(li => li.name.trim() && li.lineTotal > 0);
  const isReadOnly = mode === 'view';

  const addLineItem = () => {
    const newItem: LineItem = {
      id: `temp-${lineItemIdCounter.current++}`,
      name: '',
      qty: 1,
      unit: '',
      unitPrice: 0,
      lineTotal: 0,
    };
    setData(prev => ({ ...prev, lineItems: [...prev.lineItems, newItem] }));
  };

  const updateLineItem = (id: string, updates: Partial<LineItem>) => {
    setData(prev => ({
      ...prev,
      lineItems: prev.lineItems.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if ('qty' in updates || 'unitPrice' in updates) {
          updated.lineTotal = Math.round(updated.qty * updated.unitPrice);
        }
        return updated;
      }),
    }));
  };

  const removeLineItem = (id: string) => {
    setData(prev => ({ ...prev, lineItems: prev.lineItems.filter(i => i.id !== id) }));
  };

  const handleSubmit = () => {
    if (isValid) {
      // Filter out empty line items before submission
      const filteredData = {
        ...data,
        lineItems: data.lineItems.filter(item => item.name.trim() !== '')
      };
      
      // Clear stored data after successful submission
      removeStoredData();
      
      onSubmit(filteredData);
    }
  };

  const handleCancel = () => {
    // Clear stored data when canceling
    removeStoredData();
    onCancel();
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer">{t('quotes.form.customer')} *</Label>
            <CustomerCombobox
              customers={customers}
              value={data.customerId}
              onChange={(id) => setData(prev => ({ ...prev, customerId: id }))}
              placeholder={t('quotes.form.selectCustomer')}
              disabled={disabled || isReadOnly}
              onCreateCustomer={() => setShowCreateCustomer(true)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t('quotes.form.serviceAddress')}</Label>
            <Input
              id="address"
              value={data.address}
              onChange={(e) => setData(prev => ({ ...prev, address: e.target.value }))}
              placeholder={t('quotes.form.serviceAddressPlaceholder')}
              disabled={disabled || isReadOnly}
              readOnly={isReadOnly}
            />
          </div>

          <LineItemsEditor
            items={data.lineItems}
            onAdd={addLineItem}
            onUpdate={updateLineItem}
            onRemove={removeLineItem}
            disabled={disabled || isReadOnly}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-4">
            <div className="space-y-2">
              <Label>{t('quotes.form.taxRate')}</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.taxRate * 100}
                onChange={(e) => setData(prev => ({ ...prev, taxRate: (parseFloat(e.target.value) || 0) / 100 }))}
                disabled={disabled || isReadOnly}
                readOnly={isReadOnly}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('quotes.form.discount')}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  className="pl-7"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={discountInput}
                  onChange={(e) => {
                    const sanitized = sanitizeMoneyTyping(e.target.value);
                    setDiscountInput(sanitized);
                    const cents = parseCurrencyInput(sanitized);
                    const maxDiscount = totals.subtotal + totals.taxAmount;
                    setData(prev => ({ ...prev, discount: Math.min(cents, maxDiscount) }));
                  }}
                  onBlur={() => setDiscountInput(formatCurrencyInputNoSymbol(data.discount))}
                  disabled={disabled || isReadOnly}
                  readOnly={isReadOnly}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="deposit-required"
                  checked={data.depositRequired}
                  onCheckedChange={(checked) => setData(prev => ({ ...prev, depositRequired: !!checked }))}
                  disabled={isReadOnly}
                />
                <Label htmlFor="deposit-required">{t('quotes.form.deposit.required')}</Label>
              </div>
              {data.depositRequired && (
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder={t('quotes.form.deposit.percentage')}
                  value={data.depositPercent}
                  onChange={(e) => setData(prev => ({ ...prev, depositPercent: parseInt(e.target.value) || 0 }))}
                  disabled={disabled || isReadOnly}
                  readOnly={isReadOnly}
                />
              )}
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Billing Frequency</Label>
                {data.isSubscription ? (
                  <Select
                    value={data.frequency}
                    onValueChange={(value) => setData(prev => ({ ...prev, frequency: value as any }))}
                    disabled={isReadOnly}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select billing frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bi-monthly">{t('quotes.form.frequency.biMonthly')}</SelectItem>
                      <SelectItem value="monthly">{t('quotes.form.frequency.monthly')}</SelectItem>
                      <SelectItem value="bi-yearly">{t('quotes.form.frequency.biYearly')}</SelectItem>
                      <SelectItem value="yearly">{t('quotes.form.frequency.yearly')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm">
                    One-off
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t('quotes.form.paymentTerms.label')}</Label>
                <Select
                  value={data.paymentTerms}
                  onValueChange={(value) => setData(prev => ({ ...prev, paymentTerms: value as any }))}
                  disabled={isReadOnly}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_on_receipt">{t('quotes.form.paymentTerms.dueOnReceipt')}</SelectItem>
                    <SelectItem value="net_15">{t('quotes.form.paymentTerms.net15')}</SelectItem>
                    <SelectItem value="net_30">{t('quotes.form.paymentTerms.net30')}</SelectItem>
                    <SelectItem value="net_60">{t('quotes.form.paymentTerms.net60')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="subscription-service"
                  checked={data.isSubscription}
                  onCheckedChange={(checked) => setData(prev => ({ 
                    ...prev, 
                    isSubscription: Boolean(checked),
                    frequency: checked ? 'bi-monthly' : 'one-off'
                  }))}
                  disabled={isReadOnly}
                />
                <Label htmlFor="subscription-service">Subscription Service</Label>
              </div>
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t('quotes.form.summary.subtotal')}:</span>
                <span>${(totals.subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('quotes.form.summary.tax')}:</span>
                <span>${(totals.taxAmount / 100).toFixed(2)}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between">
                  <span>{t('quotes.form.summary.discount')}:</span>
                  <span>-${(data.discount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base pt-2 border-t">
                <span>{t('quotes.form.summary.total')}:</span>
                <span>${(totals.total / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add text fields for terms and notes */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="terms">{t('quotes.form.terms')}</Label>
          <Textarea
            id="terms"
            value={data.terms}
            onChange={(e) => setData(prev => ({ ...prev, terms: e.target.value }))}
            placeholder={t('quotes.form.termsPlaceholder')}
            disabled={disabled || isReadOnly}
            readOnly={isReadOnly}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">{t('quotes.form.internalNotes')}</Label>
          <Textarea
            id="notes"
            value={data.notesInternal}
            onChange={(e) => setData(prev => ({ ...prev, notesInternal: e.target.value }))}
            placeholder={t('quotes.form.internalNotesPlaceholder')}
            disabled={disabled || isReadOnly}
            readOnly={isReadOnly}
          />
        </div>
      </div>

      {!isReadOnly && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {lastSaved && (
              <span className="text-xs text-muted-foreground">
                Draft saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={disabled}>
              {t('quotes.form.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={!isValid || disabled}>
              {mode === 'edit' ? t('quotes.form.updateQuote') : t('quotes.form.createQuote')}
            </Button>
          </div>
        </div>
      )}
      
      {/* Inline Customer Creation Modal */}
      <CustomerBottomModal
        open={showCreateCustomer}
        onOpenChange={setShowCreateCustomer}
        onCustomerCreated={(newCustomer) => {
          setData(prev => ({ ...prev, customerId: newCustomer.id }));
          setShowCreateCustomer(false);
        }}
      />
    </div>
  );
}