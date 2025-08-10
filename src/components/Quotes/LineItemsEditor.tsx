import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import type { LineItem } from "@/types";

interface LineItemsEditorProps {
  items: LineItem[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<LineItem>) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

export function LineItemsEditor({ items, onAdd, onUpdate, onRemove, disabled }: LineItemsEditorProps) {
  const isInvalid = (item: LineItem) => !item.name.trim() || (item.lineTotal ?? 0) <= 0;
  const isLast = (id: string) => items.length && items[items.length - 1]?.id === id;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm">Line Items *</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={disabled}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">No line items yet. Click "Add Item" to get started.</div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 text-xs font-medium">
            <div className="col-span-8">Item</div>
            <div className="col-span-3 text-right pr-1">Amount</div>
            <div className="col-span-1" />
          </div>
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end px-3 py-3">
                <div className="col-span-8">
                  <Label className="text-xs" htmlFor={`li-name-${item.id}`}>Name</Label>
                  <Input
                    id={`li-name-${item.id}`}
                    value={item.name}
                    aria-invalid={isInvalid(item) && !item.name.trim()}
                    aria-describedby={isInvalid(item) && !item.name.trim() ? `li-name-${item.id}-error` : undefined}
                    onChange={(e) => onUpdate(item.id, { name: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isLast(item.id)) onAdd();
                      if ((e.key === 'Backspace' || e.key === 'Delete') && !item.name && (item.lineTotal ?? 0) === 0) onRemove(item.id);
                    }}
                    placeholder="Service or item name"
                    disabled={disabled}
                  />
                  {isInvalid(item) && !item.name.trim() && (
                    <p id={`li-name-${item.id}-error`} className="mt-1 text-xs text-destructive">Name is required</p>
                  )}
                </div>
                <div className="col-span-3">
                  <Label className="text-xs" htmlFor={`li-amount-${item.id}`}>$ Amount</Label>
                  <Input
                    id={`li-amount-${item.id}`}
                    inputMode="decimal"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.lineTotal / 100}
                    aria-invalid={isInvalid(item) && (item.lineTotal ?? 0) <= 0}
                    aria-describedby={isInvalid(item) && (item.lineTotal ?? 0) <= 0 ? `li-amount-${item.id}-error` : undefined}
                    onChange={(e) => {
                      const amount = Math.max(0, parseFloat(e.target.value) || 0)
                      const cents = Math.round(amount * 100)
                      onUpdate(item.id, { lineTotal: cents, qty: 1, unitPrice: cents })
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && isLast(item.id)) onAdd();
                      if ((e.key === 'Backspace' || e.key === 'Delete') && (!e.currentTarget.value || e.currentTarget.value === '0')) onRemove(item.id);
                    }}
                    disabled={disabled}
                  />
                  {isInvalid(item) && (item.lineTotal ?? 0) <= 0 && (
                    <p id={`li-amount-${item.id}-error`} className="mt-1 text-xs text-destructive">Amount must be greater than $0</p>
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  <Button
                    aria-label="Remove line item"
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(item.id)}
                    className="text-destructive hover:text-destructive"
                    disabled={disabled}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
