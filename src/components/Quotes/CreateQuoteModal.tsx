import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useStore } from "@/store/useAppStore";
import type { Customer, LineItem, Quote } from "@/types";
import { formatMoney as formatCurrency, parseCurrencyInput, formatCurrencyInputNoSymbol, parsePercentInput } from "@/utils/format";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { useQueryClient } from "@tanstack/react-query";
import { CustomerCombobox } from "@/components/Quotes/CustomerCombobox";
import { LineItemsEditor } from "@/components/Quotes/LineItemsEditor";

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
  const { getToken } = useClerkAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [savedQuoteId, setSavedQuoteId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const autosaveTimer = useRef<number | null>(null);
  const [discountInput, setDiscountInput] = useState<string>("");
  const [depositPercentInput, setDepositPercentInput] = useState<string>("");
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
      setDiscountInput(formatCurrencyInputNoSymbol(0));
      setDepositPercentInput("");
    }
  }, [open, store.business.taxRateDefault, defaultTaxRate]);

  const totals = useMemo(() => calculateQuoteTotals(draft.lineItems, draft.taxRate, draft.discount), [draft.lineItems, draft.taxRate, draft.discount]);

  const isValid = useMemo(() => {
    const hasCustomer = !!draft.customerId;
    const hasValidItem = draft.lineItems.some((li) => li.name.trim() && (li.lineTotal ?? 0) > 0);
    return hasCustomer && hasValidItem;
  }, [draft.customerId, draft.lineItems]);

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
    if (!isValid) {
      toast.error("Please complete required fields");
      return null;
    }
    setSaving(true);
    setSaveStatus("saving");
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");

      const payload = {
        customerId: draft.customerId,
        address: draft.address || null,
        lineItems: draft.lineItems.map((li) => ({
          name: li.name,
          qty: 1,
          unit: li.unit || null,
          lineTotal: li.lineTotal,
        })),
        taxRate: draft.taxRate,
        discount: draft.discount,
        notesInternal: draft.notesInternal || null,
        terms: draft.terms || null,
        paymentTerms: draft.paymentTerms,
        frequency: draft.frequency,
        depositRequired: draft.depositRequired,
        depositPercent: draft.depositPercent,
      };

      const res = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/quotes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Failed to create quote (${res.status}): ${txt}`);
      }

      const data = await res.json();
      const q = data?.quote;

      const saved: Quote = {
        id: q.id,
        number: q.number,
        businessId: store.business.id,
        customerId: draft.customerId,
        address: draft.address,
        lineItems: draft.lineItems,
        taxRate: q.taxRate ?? draft.taxRate,
        discount: q.discount ?? draft.discount,
        subtotal: q.subtotal ?? 0,
        total: q.total,
        status: q.status,
        files: [],
        notesInternal: draft.notesInternal,
        terms: draft.terms,
        paymentTerms: draft.paymentTerms,
        frequency: draft.frequency,
        depositRequired: draft.depositRequired,
        depositPercent: draft.depositPercent,
        sentAt: undefined,
        viewCount: q.viewCount ?? 0,
        createdAt: q.createdAt ?? new Date().toISOString(),
        updatedAt: q.updatedAt ?? new Date().toISOString(),
        publicToken: q.publicToken,
      };

      setSavedQuoteId(saved.id);
      setSaveStatus("saved");
      setLastSavedAt(Date.now());

      // Refresh list
      queryClient.invalidateQueries({ queryKey: ["supabase", "quotes"] });

      toast.success("Quote saved");
      return saved;
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
      toast.error((e as any)?.message || "Failed to save quote");
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function updateQuote(id: string) {
    setSaveStatus("saving");
    try {
      const token = await getToken();
      if (!token) throw new Error("Not authenticated");
      const payload = {
        address: draft.address || null,
        lineItems: draft.lineItems.map((li) => ({ name: li.name, qty: 1, unit: li.unit || null, lineTotal: li.lineTotal })),
        taxRate: draft.taxRate,
        discount: draft.discount,
        notesInternal: draft.notesInternal || null,
        terms: draft.terms || null,
        paymentTerms: draft.paymentTerms,
        frequency: draft.frequency,
        depositRequired: draft.depositRequired,
        depositPercent: draft.depositPercent,
      };
      const res = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/quotes/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Failed to update quote (${res.status})`);
      setSaveStatus("saved");
      setLastSavedAt(Date.now());
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
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

  useEffect(() => {
    if (!savedQuoteId) return;
    if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    autosaveTimer.current = window.setTimeout(() => {
      updateQuote(savedQuoteId);
    }, 1200);
    return () => {
      if (autosaveTimer.current) window.clearTimeout(autosaveTimer.current);
    };
  }, [savedQuoteId, draft]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (savedQuoteId) updateQuote(savedQuoteId); else saveQuote();
      }
      if (e.shiftKey && e.key === 'Enter') {
        e.preventDefault();
        saveAndOpenSend();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, savedQuoteId, draft]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-busy={saving || saveStatus === "saving"} className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Quote</DialogTitle>
        </DialogHeader>

        {/* Main content grid */}
        <div className="grid md:grid-cols-12 gap-6">
          {/* Left: details */}
          <section className="md:col-span-7 space-y-6" aria-labelledby="quote-details-heading">
            <h2 id="quote-details-heading" className="sr-only">Quote details</h2>

            <div className="space-y-2">
              <Label htmlFor="customer">Customer *</Label>
              <CustomerCombobox
                customers={customers}
                value={draft.customerId}
                onChange={(id) => setDraft((prev) => ({ ...prev, customerId: id }))}
                placeholder="Select customer…"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Service Address</Label>
              <Input
                id="address"
                value={draft.address}
                onChange={(e) => setDraft((prev) => ({ ...prev, address: e.target.value }))}
                placeholder="Enter service address"
                disabled={saving}
              />
            </div>

            <LineItemsEditor
              items={draft.lineItems}
              onAdd={addLineItem}
              onUpdate={updateLineItem}
              onRemove={removeLineItem}
              disabled={saving}
            />
          </section>

          {/* Right: settings & summary */}
          <aside className="md:col-span-5 space-y-6" aria-labelledby="quote-settings-heading">
            <h2 id="quote-settings-heading" className="sr-only">Quote settings</h2>

            <div className="rounded-lg border p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax rate</Label>
                <Input
                  id="tax-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={draft.taxRate * 100}
                  onChange={(e) =>
                    setDraft((prev) => ({ ...prev, taxRate: (parseFloat(e.target.value) || 0) / 100 }))
                  }
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">Discount (dollars)</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="discount"
                    className="pl-7"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={discountInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDiscountInput(val);
                      setDraft((prev) => {
                        const rawCents = parseCurrencyInput(val);
                        const pre = calculateQuoteTotals(prev.lineItems, prev.taxRate, 0);
                        const max = pre.subtotal + pre.taxAmount;
                        const clamped = Math.max(0, Math.min(max, rawCents));
                        return { ...prev, discount: clamped };
                      });
                    }}
                    onBlur={() => {
                      setDraft((prev) => {
                        const rawCents = parseCurrencyInput(discountInput);
                        const pre = calculateQuoteTotals(prev.lineItems, prev.taxRate, 0);
                        const max = pre.subtotal + pre.taxAmount;
                        const clamped = Math.max(0, Math.min(max, rawCents));
                        setDiscountInput(formatCurrencyInputNoSymbol(clamped));
                        return { ...prev, discount: clamped };
                      });
                    }}
                    disabled={saving}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Terms</Label>
                  <Select
                    value={draft.paymentTerms}
                    onValueChange={(value) => setDraft((prev) => ({ ...prev, paymentTerms: value as any }))}
                  >
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
                  <Select
                    value={draft.frequency}
                    onValueChange={(value) => setDraft((prev) => ({ ...prev, frequency: value as any }))}
                  >
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
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="deposit-required"
                    checked={draft.depositRequired}
                    onCheckedChange={(checked) => setDraft((prev) => ({ ...prev, depositRequired: Boolean(checked) }))}
                    disabled={saving}
                  />
                  <Label htmlFor="deposit-required" className="text-sm font-normal">Deposit required</Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="deposit-percent">Deposit percent</Label>
                  <div className="relative">
                    <Input
                      id="deposit-percent"
                      type="text"
                      inputMode="decimal"
                      className="pr-7"
                      placeholder="0"
                      value={depositPercentInput}
                      onChange={(e) => {
                        const n = parsePercentInput(e.target.value);
                        setDepositPercentInput(String(n));
                        setDraft((prev) => ({ ...prev, depositPercent: n }));
                      }}
                      disabled={!draft.depositRequired || saving}
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-1 text-sm">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Tax ({Math.round(draft.taxRate * 100)}%)</span>
                  <span>{formatCurrency(totals.taxAmount)}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Discount</span>
                  <span>-{formatCurrency(draft.discount)}</span>
                </div>
                <div className="flex items-center justify-between font-semibold">
                  <span>Total</span>
                  <span className="font-bold">{formatCurrency(totals.total)}</span>
                </div>
                {draft.depositRequired && draft.depositPercent > 0 && (
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Deposit due on acceptance ({draft.depositPercent}%)</span>
                    <span>{formatCurrency(Math.round(totals.total * (draft.depositPercent / 100)))}</span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        {/* Sticky footer actions */}
        <div className="sticky bottom-0 left-0 right-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t mt-4 z-40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 md:px-6 py-3">
            <div className="text-xs text-muted-foreground" role="status" aria-live="polite">
              {saveStatus === 'saving' && 'Saving…'}
              {saveStatus === 'saved' && lastSavedAt ? `Saved ${Math.max(1, Math.round((Date.now()-lastSavedAt)/1000))}s ago` : saveStatus === 'idle' ? 'Review and send your quote.' : null}
              {saveStatus === 'error' && 'Save failed. Will retry on next change.'}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={saving || saveStatus === 'saving'}>Cancel</Button>
              <Button variant="ghost" onClick={async () => { const saved = await createQuote(); if (saved) onOpenChange(false); }} disabled={!isValid || saving || !!savedQuoteId}>{saving ? "Saving..." : "Save"}</Button>
              <Button variant="outline" onClick={saveAndOpenSend} disabled={!isValid || saving}>{"Preview Email"}</Button>
              <Button onClick={saveAndOpenSend} disabled={!isValid || saving}>{saving ? "Saving..." : "Save & Send"}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
