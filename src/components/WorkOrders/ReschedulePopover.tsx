import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from "sonner";
import { addMinutes, format } from "date-fns";
import type { Job } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { invalidationHelpers } from '@/queries/keys';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReschedulePopoverProps {
  job: Job;
  onDone?: () => void | Promise<void>;
  asDropdownItem?: boolean;
}

export default function ReschedulePopover({ job, onDone, asDropdownItem = false }: ReschedulePopoverProps) {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(job.startsAt ? new Date(job.startsAt) : undefined);
  const [time, setTime] = useState<string>(job.startsAt ? format(new Date(job.startsAt), "HH:mm") : "08:00");
  const [durationMins, setDurationMins] = useState<number>(60);
  const [submitting, setSubmitting] = useState(false);

  const handleSave = async () => {
    if (!date) {
      toast.error(t('workOrders.reschedule.pickDate'));
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
          success: t('workOrders.reschedule.messages.updated'),
          loading: t('workOrders.reschedule.title'),
          error: t('workOrders.reschedule.messages.failed')
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
          success: t('workOrders.reschedule.messages.unscheduled'),
          loading: t('workOrders.reschedule.unschedule'),
          error: t('workOrders.reschedule.messages.failed')
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
        {asDropdownItem ? (
          <span className="flex items-center gap-2 cursor-pointer">
            <CalendarIcon className="h-4 w-4" />
            {job.startsAt ? t('workOrders.reschedule.title') : t('workOrders.reschedule.schedule')}
          </span>
        ) : (
          <Button size="sm" variant="outline">{job.startsAt ? t('workOrders.reschedule.title') : t('workOrders.reschedule.schedule')}</Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t('workOrders.reschedule.startTime')}</label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">{t('workOrders.reschedule.duration')}</label>
              <select
                className="h-9 rounded-md border bg-background px-2 text-sm"
                value={durationMins}
                onChange={(e) => setDurationMins(parseInt(e.target.value, 10))}
              >
                {[30, 45, 60, 90, 120, 180].map((d) => (
                  <option key={d} value={d}>{d} {t('workOrders.reschedule.minutes')}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button variant="ghost" size="sm" onClick={handleUnschedule} disabled={submitting}>
              {t('workOrders.reschedule.unschedule')}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={submitting}>
              {t('workOrders.reschedule.save')}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
