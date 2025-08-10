import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSupabaseQuotes } from "@/hooks/useSupabaseQuotes";
import { Loader2 } from "lucide-react";

interface PickQuoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (quoteId: string) => void;
  customerId?: string;
}

export default function PickQuoteModal({ open, onOpenChange, onSelect, customerId }: PickQuoteModalProps) {
  const { data } = useSupabaseQuotes({ enabled: open });
const [query, setQuery] = useState("");
const [busy, setBusy] = useState(false);
const [selectedId, setSelectedId] = useState<string | null>(null);
  const quotes = useMemo(() => {
    let rows = data?.rows ?? [];
    if (customerId) rows = rows.filter((r) => r.customerId === customerId);
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => (
      r.number.toLowerCase().includes(q) ||
      (r.customerName || "").toLowerCase().includes(q) ||
      (r.customerEmail || "").toLowerCase().includes(q)
    ));
  }, [data, query, customerId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select a Quote</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Search by quote number, customer, or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <ScrollArea className="max-h-80 rounded-md border">
            <div className="p-2 space-y-1">
              {quotes.length === 0 && (
                <div className="text-sm text-muted-foreground p-3">
                  No quotes found.
                </div>
              )}

              {quotes.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (busy) return;
                    setBusy(true);
                    setSelectedId(q.id);
                    onSelect(q.id);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 ${busy ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{q.number} — {q.customerName || "Customer"}</div>
                      <div className="text-xs text-muted-foreground truncate">{q.customerEmail}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {busy && selectedId === q.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading" />
                      )}
                      <Badge variant="outline" className="text-xs">{q.status}</Badge>
                      <span className="text-sm tabular-nums">
                        {new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format((q.total ?? 0) / 100)}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
