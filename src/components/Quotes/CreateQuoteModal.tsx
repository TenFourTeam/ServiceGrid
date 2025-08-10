import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/store/useAppStore";
import type { Customer, LineItem, Quote } from "@/types";
import { formatMoney as formatCurrency } from "@/utils/format";

export interface CreateQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  defaultTaxRate?: number;
  onRequestSend?: (quote: Quote) => void;
}

interface QuoteDraft {
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
  depositPercent: number; // 0..100
}

function calculateLineTotal(qty: number, unitPrice: number): number {
  return Math.round(qty * unitPrice);
}

function calculateQuoteTotals(lineItems: LineItem[], taxRate: number, discount: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const taxAmount = Math.round(subtotal * taxRate);
  const total = subtotal + taxAmount - discount;
  return { subtotal, taxAmount, total };
}

export default function CreateQuoteModal({ open, onOpenChange, customers, defaultTaxRate = 0.1, onRequestSend }: CreateQuoteModalProps) {
  const store = useStore();
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<QuoteDraft>({
    customerId: "",
    address: "",
    lineItems: [],
    taxRate: defaultTaxRate,
    discount: 0,
    notesInternal: "",
    terms: "",
    paymentTerms: "due_on_receipt",
    frequency: "one-off",
    depositRequired: false,
    depositPercent: 0,
  });
  const lineItemIdCounter = useRef(1);

  useEffect(() => {
    if (open) {
      // reset when opened
      setDraft({
        customerId: "",
        address: "",
        lineItems: [],
        taxRate: store.business.taxRateDefault ?? defaultTaxRate,
        discount: 0,
        notesInternal: "",
        terms: "",
        paymentTerms: "due_on_receipt",
        frequency: "one-off",
        depositRequired: false,
        depositPercent: 0,
      });
      lineItemIdCounter.current = 1;
    }
  }, [open, store.business.taxRateDefault, defaultTaxRate]);

  const totals = useMemo(() => calculateQuoteTotals(draft.lineItems, draft.taxRate, draft.discount), [draft.lineItems, draft.taxRate, draft.discount]);

  function addLineItem() {
    const newItem: LineItem = {
      id: `temp-${lineItemIdCounter.current++}`,
      name: "",
      qty: 1,
      unit: "",
      unitPrice: 0,
      lineTotal: 0,
    };
    setDraft((prev) => ({ ...prev, lineItems: [...prev.lineItems, newItem] }));
  }

  function updateLineItem(id: string, updates: Partial<LineItem>) {
    setDraft((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, ...updates };
        if ("qty" in updates || "unitPrice" in updates) {
          updated.lineTotal = calculateLineTotal(updated.qty, updated.unitPrice);
        }
        return updated;
      }),
    }));
  }

  function removeLineItem(id: string) {
    setDraft((prev) => ({ ...prev, lineItems: prev.lineItems.filter((i) => i.id !== id) }));
  }

  async function createQuote(): Promise<Quote | null> {
    if (!draft.customerId) {
      toast.error("Please select a customer");
      return null;
    }
    if (draft.lineItems.length === 0) {
      toast.error("Please add at least one line item");
      return null;
    }
    setSaving(true);
    try {
      const { subtotal, total } = calculateQuoteTotals(draft.lineItems, draft.taxRate, draft.discount);
      const saved = store.upsertQuote({
        businessId: store.business.id,
        customerId: draft.customerId,
        address: draft.address,
        lineItems: draft.lineItems,
        taxRate: draft.taxRate,
        discount: draft.discount,
        subtotal,
        total,
        status: "Draft",
        files: [],
        notesInternal: draft.notesInternal,
        terms: draft.terms,
        paymentTerms: draft.paymentTerms,
        frequency: draft.frequency,
        depositRequired: draft.depositRequired,
        depositPercent: draft.depositPercent,
      });
      toast.success("Quote saved");
      return saved;
    } catch (e) {
      console.error(e);
      toast.error("Failed to save quote");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function saveQuote() {
    const saved = await createQuote();
    if (saved) onOpenChange(false);
  }

  async function saveAndOpenSend() {
    const saved = await createQuote();
    if (saved) {
      onOpenChange(false);
      onRequestSend?.(saved);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Quote</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <Select value={draft.customerId} onValueChange={(value) => setDraft((prev) => ({ ...prev, customerId: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Service Address</Label>
              <Input id="address" value={draft.address} onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))} placeholder="Enter service address" />
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
              <div className="text-center py-8 text-muted-foreground">No line items yet. Click "Add Item" to get started.</div>
            ) : (
              <div className="space-y-3">
                {draft.lineItems.map((item) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-lg">
                    <div className="col-span-8">
                      <Label className="text-xs">Name</Label>
                      <Input value={item.name} onChange={(e) => updateLineItem(item.id, { name: e.target.value })} placeholder="Service or item name" />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">$ Amount</Label>
                      <Input type="number" min="0" step="0.01" value={item.lineTotal / 100} onChange={(e) => {
                        const amount = Math.max(0, parseFloat(e.target.value) || 0)
                        const cents = Math.round(amount * 100)
                        updateLineItem(item.id, { lineTotal: cents, qty: 1, unitPrice: cents })
                      }} />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeLineItem(item.id)} className="text-destructive hover:text-destructive">
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
                <Input id="tax-rate" type="number" min="0" max="100" step="0.01" value={draft.taxRate * 100} onChange={(e) => setDraft((prev) => ({ ...prev, taxRate: (parseFloat(e.target.value) || 0) / 100 }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Discount ($)</Label>
                <Input id="discount" type="number" min="0" step="0.01" value={draft.discount / 100} onChange={(e) => setDraft((prev) => ({ ...prev, discount: Math.round((parseFloat(e.target.value) || 0) * 100) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax:</span><span>{formatCurrency(totals.taxAmount)}</span></div>
              <div className="flex justify-between"><span>Discount:</span><span>-{formatCurrency(draft.discount)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total:</span><span>{formatCurrency(totals.total)}</span></div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>Payment Terms</Label>
              <Select value={draft.paymentTerms} onValueChange={(value) => setDraft((prev) => ({ ...prev, paymentTerms: value as any }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select terms" />
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
              <Select value={draft.frequency} onValueChange={(value) => setDraft((prev) => ({ ...prev, frequency: value as any }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
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
            <div className="space-y-2">
              <Label>Deposit</Label>
              <div className="flex items-center gap-3">
                <Switch checked={draft.depositRequired} onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, depositRequired: Boolean(checked) }))} />
                <Input type="number" min={0} max={100} step={1} value={draft.depositPercent} onChange={(e) => setDraft((prev) => ({ ...prev, depositPercent: Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)) }))} disabled={!draft.depositRequired} />
                <span className="text-sm text-muted-foreground">% up front</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea id="notes" value={draft.notesInternal} onChange={(e) => setDraft((prev) => ({ ...prev, notesInternal: e.target.value }))} placeholder="Internal notes (not visible to customer)" rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="terms">Terms & Conditions</Label>
              <Textarea id="terms" value={draft.terms} onChange={(e) => setDraft((prev) => ({ ...prev, terms: e.target.value }))} placeholder="Terms and conditions" rows={3} />
            </div>
          </div>

          <div className="border-t pt-4 mt-2 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Autosaves</div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
              <Button variant="outline" onClick={saveAndOpenSend} disabled={saving}>Preview Email</Button>
              <Button onClick={saveAndOpenSend} disabled={saving}>{saving ? "Saving..." : "Save & Send"}</Button>
              <Button variant="ghost" onClick={saveQuote} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
