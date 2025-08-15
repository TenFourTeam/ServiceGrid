import { useEffect, useMemo, useRef, useState } from "react";
import { useCustomersData } from "@/queries/unified";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime, formatMoney } from "@/utils/format";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { toast } from "sonner";
import ReschedulePopover from "@/components/WorkOrders/ReschedulePopover";
import type { Job } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle as ModalTitle } from "@/components/ui/dialog";
import PickQuoteModal from "@/components/Jobs/PickQuoteModal";
import { useQueryClient } from "@tanstack/react-query";
import { invalidationHelpers } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface JobShowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Pick<Job, "id" | "customerId" | "startsAt" | "endsAt" | "status"> & Partial<Pick<Job, "notes" | "address" | "total" | "photos" | "quoteId" >>;
}

export default function JobShowModal({ open, onOpenChange, job }: JobShowModalProps) {
  const { data: customers = [] } = useCustomersData();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();
  const [localNotes, setLocalNotes] = useState(job.notes ?? "");
  const notesTimer = useRef<number | null>(null);
  const { getToken } = useClerkAuth();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [optimisticStatus, setOptimisticStatus] = useState<Job['status'] | null>(null);
  const [isAdvancing, setIsAdvancing] = useState(false);
  useEffect(() => {
    setLocalNotes(job.notes ?? "");
  }, [job.id]);
  useEffect(() => {
    setOptimisticStatus(null);
    setIsAdvancing(false);
  }, [job.id]);

  const customerName = useMemo(() => customers.find(c => c.id === job.customerId)?.name || "Customer", [customers, job.customerId]);
  const photos: string[] = Array.isArray((job as any).photos) ? ((job as any).photos as string[]) : [];

  useEffect(() => {
    if (!viewerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setViewerOpen(false);
      if (photos.length > 0) {
        if (e.key === 'ArrowRight') setViewerIndex((i) => (i + 1) % photos.length);
        if (e.key === 'ArrowLeft') setViewerIndex((i) => (i - 1 + photos.length) % photos.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [viewerOpen, photos.length]);

  async function handleCreateInvoice() {
    if (!(job as any).quoteId) { setPickerOpen(true); toast.info('Link a quote to this job before creating an invoice.'); return; }
    try {
      const data = await edgeRequest(fn('invoices'), {
        method: 'POST',
        body: JSON.stringify({ jobId: job.id }),
      });
      toast.success('Invoice created');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create invoice');
    }
  }

  async function handleAdvanceStatus() {
    const current = optimisticStatus ?? job.status;
    if (current === 'Completed' || isAdvancing) return;
    const nextStatus: Job['status'] = current === 'Scheduled' ? 'In Progress' : 'Completed';

    const prevStatus = current;
    setIsAdvancing(true);
    setOptimisticStatus(nextStatus);

    try {
      const data = await edgeRequest(fn(`jobs?id=${job.id}`), {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
      toast.success(`Status updated to ${nextStatus}`);
    } catch (e: any) {
      // Revert on failure
      setOptimisticStatus(prevStatus);
      toast.error(e?.message || 'Failed to advance status');
    } finally {
      setIsAdvancing(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Job Details</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-sm text-muted-foreground">Customer</div>
              <div className="font-medium">{customerName}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="font-medium">{(optimisticStatus ?? job.status)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Starts</div>
              <div>{formatDateTime(job.startsAt)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ends</div>
              <div>{formatDateTime(job.endsAt)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Address</div>
              <div className="truncate">{job.address || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Total</div>
              <div>{typeof job.total === 'number' ? formatMoney(job.total) : '—'}</div>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Notes</div>
            <Textarea
              value={localNotes}
              onChange={(e)=>{
                const val = e.target.value;
                setLocalNotes(val);
                if (notesTimer.current) window.clearTimeout(notesTimer.current);
                notesTimer.current = window.setTimeout(async ()=>{
                    try {
                      await edgeRequest(fn(`jobs?id=${job.id}`), {
                        method: 'PATCH',
                        body: JSON.stringify({ notes: val }),
                      });
                       if (businessId) {
                         invalidationHelpers.jobs(queryClient, businessId);
                       }
                    } catch {}
                }, 600) as unknown as number;
              }}
            />
          </div>

          <div>
            <div className="text-sm text-muted-foreground mb-1">Photos</div>
            {Array.isArray((job as any).photos) && (job as any).photos.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {(job as any).photos.map((url: string, idx: number) => (
                  <a key={idx} href={url} target="_blank" rel="noreferrer" className="block">
                    <img
                      src={url}
                      alt={`Job photo ${idx + 1}`}
                      loading="lazy"
                      className="w-full h-20 object-cover rounded-md border"
                    />
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No photos yet.</div>
            )}
          </div>
        </div>
        <DrawerFooter>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button onClick={handleAdvanceStatus} disabled={(optimisticStatus ?? job.status) === 'Completed' || isAdvancing}>Advance Status</Button>
              {((optimisticStatus ?? job.status) === 'Scheduled') && (
                <ReschedulePopover job={job as Job} onDone={()=>{ /* no-op, realtime/subsequent fetch updates UI */ }} />
              )}
              {!(job as any).quoteId && (
                <Button variant="outline" onClick={() => setPickerOpen(true)}>Link Quote</Button>
              )}
              <Button variant="outline" onClick={handleCreateInvoice}>Create Invoice</Button>
            </div>
            <div>
              <Button variant="destructive" onClick={async () => {
                try {
                  await edgeRequest(fn(`jobs?id=${job.id}`), { method: 'DELETE' });
                  if (businessId) {
                    invalidationHelpers.jobs(queryClient, businessId);
                  }
                  toast.success('Job deleted');
                  onOpenChange(false);
                } catch (e: any) {
                  toast.error(e?.message || 'Failed to delete job');
                }
              }}>Delete</Button>
            </div>
          </div>
        </DrawerFooter>

        <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <ModalTitle>Photo {viewerIndex + 1} of {photos.length}</ModalTitle>
            </DialogHeader>
            {photos.length > 0 && (
              <div className="relative">
                <img
                  src={photos[viewerIndex]}
                  alt={`Job photo ${viewerIndex + 1}`}
                  className="max-h-[70vh] w-full object-contain rounded"
                />
                <div className="absolute inset-0 flex items-center justify-between pointer-events-none px-2">
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={(e)=>{ e.stopPropagation(); setViewerIndex((i)=> (i - 1 + photos.length) % photos.length); }}
                    className="pointer-events-auto px-3 py-2 rounded-md bg-background/60 border"
                  >
                    Prev
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={(e)=>{ e.stopPropagation(); setViewerIndex((i)=> (i + 1) % photos.length); }}
                    className="pointer-events-auto px-3 py-2 rounded-md bg-background/60 border"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        <PickQuoteModal
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          customerId={job.customerId}
          onSelect={async (quoteId) => {
            try {
              const data = await edgeRequest(fn(`jobs?id=${job.id}`), {
                method: 'PATCH',
                body: JSON.stringify({ quoteId }),
              });
              if (businessId) {
                invalidationHelpers.jobs(queryClient, businessId);
              }
              toast.success('Quote linked to job');
              setPickerOpen(false);
            } catch (e: any) {
              toast.error(e?.message || 'Failed to link quote');
            }
          }}
        />
      </DrawerContent>
    </Drawer>
  );
}