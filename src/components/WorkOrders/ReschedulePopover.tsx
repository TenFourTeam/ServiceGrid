import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { createAuthEdgeApi } from '@/utils/authEdgeApi';
import { toast } from "sonner";
import { addMinutes, format } from "date-fns";
import type { Job } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { invalidationHelpers } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';

interface ReschedulePopoverProps {
  job: Job;
  onDone?: () => void | Promise<void>;
}

export default function ReschedulePopover({ job, onDone }: ReschedulePopoverProps) {
  const { getToken } = useClerkAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(job.startsAt ? new Date(job.startsAt) : undefined);
  const [time, setTime] = useState<string>(job.startsAt ? format(new Date(job.startsAt), "HH:mm") : "08:00");
  const [durationMins, setDurationMins] = useState<number>(60);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!date) {
      toast.error("Pick a date");
      return;
    }
    try {
      setSubmitting(true);
      
      const [h, m] = time.split(":").map((t) => parseInt(t, 10));
      const starts = new Date(date);
      starts.setHours(h || 0, m || 0, 0, 0);
      const ends = addMinutes(starts, durationMins);

      const { error } = await authApi.invoke("jobs?id=" + job.id, {
        method: "PATCH",
        body: { startsAt: starts.toISOString(), endsAt: ends.toISOString() },
        toast: {
          success: "Job rescheduled successfully",
          loading: "Rescheduling job...",
          error: "Failed to reschedule"
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to reschedule job');
      }
      
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
      
      setOpen(false);
      await onDone?.();
    } catch (e: any) {
      console.error('Failed to reschedule job:', e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnschedule = async () => {
    try {
      setSubmitting(true);
      
      const { error } = await authApi.invoke("jobs?id=" + job.id, {
        method: "PATCH",
        body: { startsAt: null, endsAt: null },
        toast: {
          success: "Job unscheduled successfully",
          loading: "Unscheduling job...",
          error: "Failed to unschedule"
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to unschedule job');
      }
      
      if (businessId) {
        invalidationHelpers.jobs(queryClient, businessId);
      }
      
      setOpen(false);
      await onDone?.();
    } catch (e: any) {
      console.error('Failed to unschedule job:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="secondary">{job.startsAt ? "Reschedule" : "Schedule"}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Start time</label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Duration</label>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={durationMins}
                onChange={(e) => setDurationMins(parseInt(e.target.value, 10))}
              >
                {[30, 45, 60, 90, 120, 180].map((d) => (
                  <option key={d} value={d}>{d} min</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={handleUnschedule} disabled={submitting}>
              Unschedule
            </Button>
            <Button size="sm" onClick={handleSave} disabled={submitting}>
              Save
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
