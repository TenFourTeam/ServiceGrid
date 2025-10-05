import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useJobsData } from '@/hooks/useJobsData';
import { useCustomersData } from '@/queries/unified';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { Loader2 } from "lucide-react";
import { formatMoney } from '@/utils/format';

interface PickJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (jobId: string) => void;
  customerId?: string;
}

export default function PickJobModal({ open, onOpenChange, onSelect, customerId }: PickJobModalProps) {
  const { businessId } = useBusinessContext();
  const { data: jobs } = useJobsData(businessId);
  const { data: customers } = useCustomersData();
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  const filteredJobs = useMemo(() => {
    const allJobs = jobs || [];
    
    // Map jobs to include customer info
    const jobsWithCustomer = allJobs.map((j: any) => {
      const customer = customers?.find(c => c.id === j.customerId);
      return {
        id: j.id,
        title: j.title || 'Untitled Job',
        status: j.status,
        customerId: j.customerId,
        customerName: customer?.name || 'Unknown Customer',
        customerEmail: customer?.email || '',
        total: j.total,
        notes: j.notes
      };
    });
    
    let rows = jobsWithCustomer;
    if (customerId) rows = rows.filter((r) => r.customerId === customerId);
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) => (
      r.title.toLowerCase().includes(q) ||
      (r.customerName || "").toLowerCase().includes(q) ||
      (r.customerEmail || "").toLowerCase().includes(q)
    ));
  }, [jobs, customers, query, customerId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Select a Work Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <Input
            placeholder="Search by job title, customer, or email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <ScrollArea className="max-h-80 rounded-md border">
            <div className="p-2 space-y-1">
              {filteredJobs.length === 0 && (
                <div className="text-sm text-muted-foreground p-3">
                  No work orders found.
                </div>
              )}

              {filteredJobs.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    if (busy) return;
                    setBusy(true);
                    setSelectedId(j.id);
                    onSelect(j.id);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50 ${busy ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{j.title} — {j.customerName}</div>
                      <div className="text-xs text-muted-foreground truncate">{j.customerEmail}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {busy && selectedId === j.id && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading" />
                      )}
                      <Badge variant="outline" className="text-xs">{j.status}</Badge>
                      {j.total && (
                        <span className="text-sm tabular-nums">
                          {formatMoney(j.total)}
                        </span>
                      )}
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