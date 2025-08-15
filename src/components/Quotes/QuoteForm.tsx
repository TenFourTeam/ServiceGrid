import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { CustomerCombobox } from '@/components/Quotes/CustomerCombobox';
import { LineItemsEditor } from '@/components/Quotes/LineItemsEditor';
import { useQuoteCalculations } from '@/hooks/useQuoteCalculations';
import { formatCurrencyInputNoSymbol, parseCurrencyInput, sanitizeMoneyTyping } from '@/utils/format';
import type { Customer, LineItem } from '@/types';

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
}

interface QuoteFormProps {
  customers: Customer[];
  defaultTaxRate: number;
  onSubmit: (data: QuoteFormData) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function QuoteForm({ customers, defaultTaxRate, onSubmit, onCancel, disabled }: QuoteFormProps) {
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
  });

  const [discountInput, setDiscountInput] = useState('');
  const lineItemIdCounter = useState(() => ({ current: 1 }))[0];

  const totals = useQuoteCalculations(data.lineItems, data.taxRate, data.discount);

  const isValid = data.customerId && data.lineItems.some(li => li.name.trim() && li.lineTotal > 0);

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
      onSubmit(data);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer">Customer *</Label>
            <CustomerCombobox
              customers={customers}
              value={data.customerId}
              onChange={(id) => setData(prev => ({ ...prev, customerId: id }))}
              placeholder="Select customer…"
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Service Address</Label>
            <Input
              id="address"
              value={data.address}
              onChange={(e) => setData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter service address"
              disabled={disabled}
            />
          </div>

          <LineItemsEditor
            items={data.lineItems}
            onAdd={addLineItem}
            onUpdate={updateLineItem}
            onRemove={removeLineItem}
            disabled={disabled}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-4">
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={data.taxRate * 100}
                onChange={(e) => setData(prev => ({ ...prev, taxRate: (parseFloat(e.target.value) || 0) / 100 }))}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label>Discount ($)</Label>
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
                  disabled={disabled}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Select
                  value={data.paymentTerms}
                  onValueChange={(value) => setData(prev => ({ ...prev, paymentTerms: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="due_on_receipt">Due on receipt</SelectItem>
                    <SelectItem value="net_15">Net 15</SelectItem>
                    <SelectItem value="net_30">Net 30</SelectItem>
                    <SelectItem value="net_60">Net 60</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={data.frequency}
                  onValueChange={(value) => setData(prev => ({ ...prev, frequency: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="one-off">One-off</SelectItem>
                    <SelectItem value="bi-monthly">Bi-monthly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="bi-yearly">Bi-yearly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="deposit-required"
                  checked={data.depositRequired}
                  onCheckedChange={(checked) => setData(prev => ({ ...prev, depositRequired: !!checked }))}
                />
                <Label htmlFor="deposit-required">Deposit Required</Label>
              </div>
              {data.depositRequired && (
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="Deposit percentage"
                  value={data.depositPercent}
                  onChange={(e) => setData(prev => ({ ...prev, depositPercent: parseInt(e.target.value) || 0 }))}
                  disabled={disabled}
                />
              )}
            </div>

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${(totals.subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>${(totals.taxAmount / 100).toFixed(2)}</span>
              </div>
              {data.discount > 0 && (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-${(data.discount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-base pt-2 border-t">
                <span>Total:</span>
                <span>${(totals.total / 100).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={disabled}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || disabled}>
          Create Quote
        </Button>
      </div>
    </div>
  );
}