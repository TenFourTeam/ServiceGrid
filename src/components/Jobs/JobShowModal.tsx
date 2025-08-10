import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/utils/format";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { getClerkTokenStrict } from "@/utils/clerkToken";
import { toast } from "sonner";
import ReschedulePopover from "@/components/WorkOrders/ReschedulePopover";
import type { Job } from "@/types";

interface JobShowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Pick<Job, "id" | "customerId" | "startsAt" | "endsAt" | "status"> & Partial<Pick<Job, "notes" | "address" | "total" >>;
}

export default function JobShowModal({ open, onOpenChange, job }: JobShowModalProps) {
  const { customers, updateJobStatus, upsertJob, deleteJob } = useStore();
  const [localNotes, setLocalNotes] = useState(job.notes ?? "");
  const notesTimer = useRef<number | null>(null);
  const { getToken } = useClerkAuth();

  useEffect(() => {
    setLocalNotes(job.notes ?? "");
  }, [job.id]);

  const customerName = useMemo(() => customers.find(c => c.id === job.customerId)?.name || "Customer", [customers, job.customerId]);

  async function handleCreateInvoice() {
    try {
      const token = await getClerkTokenStrict(getToken);
      const r = await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/invoices`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: job.id }),
      });
      if (!r.ok) {
        const txt = await r.text().catch(()=>"");
        throw new Error(`Failed to create invoice (${r.status}): ${txt}`);
      }
      toast.success('Invoice created');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to create invoice');
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
              <div className="font-medium">{job.status}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Starts</div>
              <div>{formatDateTime(job.startsAt)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ends</div>
              <div>{formatDateTime(job.endsAt)}</div>
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1">Notes</div>
            <Textarea
              value={localNotes}
              onChange={(e)=>{
                const val = e.target.value;
                setLocalNotes(val);
                const updated = { ...job, notes: val } as Job;
                upsertJob(updated);
                if (notesTimer.current) window.clearTimeout(notesTimer.current);
                notesTimer.current = window.setTimeout(async ()=>{
                  try {
                    const token = await getClerkTokenStrict(getToken);
                    await fetch(`https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/jobs?id=${job.id}`, {
                      method: 'PATCH',
                      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ notes: val }),
                    });
                  } catch {}
                }, 600) as unknown as number;
              }}
            />
          </div>
        </div>
        <DrawerFooter>
          <div className="flex items-center gap-2">
            <ReschedulePopover job={job as Job} onDone={()=>{ /* no-op, realtime/subsequent fetch updates UI */ }} />
            <Button onClick={() => updateJobStatus(job.id, job.status === 'Scheduled' ? 'In Progress' : 'Completed')}>Advance Status</Button>
            <Button variant="outline" onClick={handleCreateInvoice}>Create Invoice</Button>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
            <Button variant="destructive" onClick={() => { deleteJob(job.id); onOpenChange(false); }}>Delete</Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
