import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import type { LineItem } from "@/types";
import { parseCurrencyInput, formatCurrencyInputNoSymbol, sanitizeMoneyTyping } from "@/utils/format";
interface LineItemsEditorProps {
  items: LineItem[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<LineItem>) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}
export function LineItemsEditor({
  items,
  onAdd,
  onUpdate,
  onRemove,
  disabled
}: LineItemsEditorProps) {
  const { t } = useLanguage();
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>({});

  // Keep local formatted buffers in sync with items
  useEffect(() => {
    setAmountInputs((prev) => {
      const next: Record<string, string> = {};
      for (const it of items) {
        next[it.id] = prev[it.id] ?? (it.lineTotal ? formatCurrencyInputNoSymbol(it.lineTotal || 0) : '');
      }
      return next;
    });
  }, [items]);

  const isInvalid = (item: LineItem) => !item.name.trim() || (item.lineTotal ?? 0) <= 0;
  const isLast = (id: string) => items.length && items[items.length - 1]?.id === id;
  return <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{t('quotes.lineItems.title')} *</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={disabled}>
          <Plus className="h-4 w-4 mr-2" />
          {t('quotes.lineItems.addItem')}
        </Button>
      </div>

      {items.length === 0 ? <div className="text-center py-8 text-muted-foreground text-sm">{t('quotes.lineItems.emptyState')}</div> : <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 text-xs font-medium">
            <div className="col-span-8">{t('quotes.lineItems.item')}</div>
            <div className="col-span-3 text-right pr-1">{t('quotes.lineItems.amount')}</div>
            <div className="col-span-1" />
          </div>
          <div className="divide-y">
            {items.map(item => <div key={item.id} className="grid grid-cols-12 gap-2 items-end px-3 py-3">
                <div className="col-span-8">
                  <Label className="text-xs" htmlFor={`li-name-${item.id}`}>{t('quotes.lineItems.name')}</Label>
                  <Input id={`li-name-${item.id}`} value={item.name} aria-invalid={isInvalid(item) && !item.name.trim()} aria-describedby={isInvalid(item) && !item.name.trim() ? `li-name-${item.id}-error` : undefined} onChange={e => onUpdate(item.id, {
              name: e.target.value
            })} onKeyDown={e => {
              if (e.key === 'Enter' && isLast(item.id)) onAdd();
            }} placeholder={t('quotes.lineItems.namePlaceholder')} disabled={disabled} />
                  {isInvalid(item) && !item.name.trim()}
                </div>
                <div className="col-span-3">
                  <Label className="text-xs" htmlFor={`li-amount-${item.id}`}>{t('quotes.lineItems.amount')}</Label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id={`li-amount-${item.id}`}
                      inputMode="decimal"
                      type="text"
                      className="pl-7 placeholder:text-transparent focus:placeholder:text-transparent"
                      placeholder={t('quotes.lineItems.amountPlaceholder')}
                      value={amountInputs[item.id] ?? ''}
                      aria-invalid={isInvalid(item) && (item.lineTotal ?? 0) <= 0}
                      aria-describedby={isInvalid(item) && (item.lineTotal ?? 0) <= 0 ? `li-amount-${item.id}-error` : undefined}
                      onChange={(e) => {
                        const val = e.target.value;
                        const sanitized = sanitizeMoneyTyping(val);
                        setAmountInputs((prev) => ({ ...prev, [item.id]: sanitized }));
                        const cents = parseCurrencyInput(sanitized);
                        onUpdate(item.id, {
                          lineTotal: cents,
                          qty: 1,
                          unitPrice: cents,
                        });
                      }}
                      onBlur={(e) => {
                        const cents = parseCurrencyInput(e.currentTarget.value);
                        setAmountInputs((prev) => ({ ...prev, [item.id]: formatCurrencyInputNoSymbol(cents) }));
                        onUpdate(item.id, {
                          lineTotal: cents,
                          qty: 1,
                          unitPrice: cents,
                        });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && isLast(item.id)) onAdd();
                      }}
                      disabled={disabled}
                    />
                  </div>
                  {isInvalid(item) && (item.lineTotal ?? 0) <= 0}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button aria-label={t('quotes.lineItems.removeItem')} type="button" variant="ghost" size="icon" onClick={() => onRemove(item.id)} className="text-foreground hover:text-foreground/80" disabled={disabled}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>)}
          </div>
        </div>}
    </div>;
}