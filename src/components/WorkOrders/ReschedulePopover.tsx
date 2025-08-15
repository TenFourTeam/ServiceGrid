import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeFetchJson } from "@/utils/edgeApi";
import { toast } from "@/components/ui/use-toast";
import { addMinutes, format } from "date-fns";
import type { Job } from "@/types";

interface ReschedulePopoverProps {
  job: Job;
  onDone?: () => void | Promise<void>;
}

export default function ReschedulePopover({ job, onDone }: ReschedulePopoverProps) {
  const { getToken } = useClerkAuth();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(job.startsAt ? new Date(job.startsAt) : undefined);
  const [time, setTime] = useState<string>(job.startsAt ? format(new Date(job.startsAt), "HH:mm") : "08:00");
  const [durationMins, setDurationMins] = useState<number>(60);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!date) {
      toast({ title: "Pick a date" });
      return;
    }
    try {
      setSubmitting(true);
      const [h, m] = time.split(":").map((t) => parseInt(t, 10));
      const starts = new Date(date);
      starts.setHours(h || 0, m || 0, 0, 0);
      const ends = addMinutes(starts, durationMins);

      const data = await edgeRequest(fn("jobs?id=" + job.id), {
        method: "PATCH",
        body: JSON.stringify({ startsAt: starts.toISOString(), endsAt: ends.toISOString() }),
      });
      toast({ title: "Scheduled" });
      setOpen(false);
      await onDone?.();
    } catch (e: any) {
      toast({ title: "Failed to schedule", description: e?.message || String(e) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnschedule = async () => {
    try {
      setSubmitting(true);
      const data = await edgeRequest(fn("jobs?id=" + job.id), {
        method: "PATCH",
        body: JSON.stringify({ startsAt: null, endsAt: null }),
      });
      toast({ title: "Unscheduled" });
      setOpen(false);
      await onDone?.();
    } catch (e: any) {
      toast({ title: "Failed to unschedule", description: e?.message || String(e) });
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
