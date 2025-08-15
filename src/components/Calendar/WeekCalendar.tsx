import { useEffect, useMemo, useRef, useState } from 'react';
import { Job } from '@/types';
import { useJobsData, useCustomersData } from '@/queries/unified';
import { useJobMutations } from '@/mutations';
import { clamp, formatDateTime, minutesSinceStartOfDay } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
// Jobs data now comes from store via dashboard data
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { edgeRequest } from '@/utils/edgeApi';
import { fn } from '@/utils/functionUrl';
import { toast } from 'sonner';
import PickQuoteModal from '@/components/Jobs/PickQuoteModal';
import { supabase } from '@/integrations/supabase/client';
import JobShowModal from '@/components/Jobs/JobShowModal';
const START_ANCHOR_HOUR = 5; // visual start at 5:00
const TOTAL_MIN = 24 * 60;
function dayKey(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0, 10);
}
export function WeekCalendar({
  selectedJobId,
  date,
}: {
  selectedJobId?: string;
  date?: Date;
}) {
  const { data: jobs, refetch: refetchJobs } = useJobsData();
  const { data: customers } = useCustomersData();
  const { createJob, updateJob, deleteJob } = useJobMutations();
  
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{ start: Date; end: Date } | null>(null);
  const notesTimer = useRef<number | null>(null);
  const [highlightJobId, setHighlightJobId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => {
    const initial = (() => {
      if (selectedJobId) {
        const j = jobs.find(j => j.id === selectedJobId);
        if (j) return new Date(j.startsAt);
      }
      return new Date();
    })();
    const day = initial.getDay(); // 0=Sun
    const mondayOffset = (day + 6) % 7; // Monday start
    const monday = new Date(initial);
    monday.setDate(initial.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const days = Array.from({
    length: 7
  }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStart]);

  // Sync week start when parent date changes
  useEffect(() => {
    if (!date) return;
    const d = new Date(date);
    const day = d.getDay();
    const mondayOffset = (day + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    setWeekStart(monday);
  }, [date]);

  const { isSignedIn, getToken } = useClerkAuth();
  
  // Jobs data is now loaded via dashboard data in AppLayout
  // No need for separate range fetching

  useEffect(() => {
    if (!isSignedIn) return;
    const channel = supabase
      .channel('jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, () => {
        // Refetch jobs data when any change occurs
        refetchJobs();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isSignedIn, refetchJobs]);

  const dayJobs = useMemo(() => {
    const map: Record<string, Job[]> = {};
    days.forEach(d => map[dayKey(d)] = []);
    jobs.forEach(j => {
      const d = new Date(j.startsAt);
      const key = dayKey(d);
      if (map[key]) map[key].push(j as Job);
    });
    return map;
  }, [jobs, weekStart]);
  const [activeJob, setActiveJob] = useState<Job | null>(() => selectedJobId ? jobs.find(j => j.id === selectedJobId) as Job ?? null : null);
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function formatRangeTitle(ds: Date[]) {
    if (ds.length === 1) return ds[0].toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const first = ds[0];
    const last = ds[ds.length - 1];
    const sameMonth = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear();
    const left = first.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    const right = sameMonth ? last.toLocaleDateString(undefined, {
      day: 'numeric'
    }) : last.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    return `${left} – ${right}`;
  }
const gridRef = useRef<HTMLDivElement>(null);
const dayRefs = useRef<HTMLDivElement[]>([]);
const minutesFromAnchor = (d: Date) => {
  const m = minutesSinceStartOfDay(d);
  const anchor = START_ANCHOR_HOUR * 60;
  return m >= anchor ? m - anchor : m + (24 * 60 - anchor);
};
const minuteOfDayFromAnchorOffset = (offset: number) => {
  const anchor = START_ANCHOR_HOUR * 60;
  return (anchor + offset) % (24 * 60);
};
  async function createJobFromQuote(quoteId: string) {
    try {
      if (!pendingSlot) {
        toast.error("No time slot selected");
        return;
      }
      
      const newJob = await createJob.mutateAsync({
        customerId: '', // This will be set by the quote relationship
        quoteId,
        startsAt: pendingSlot.start.toISOString(),
        endsAt: pendingSlot.end.toISOString(),
      });
      
      setActiveJob(newJob as Job);
      setHighlightJobId(newJob.id);
      setTimeout(() => setHighlightJobId(null), 3000);
      setPickerOpen(false);
      setPendingSlot(null);
    } catch (e: any) {
      console.error(e);
      // Error handling is already in the mutation
    }
  }

  async function createInvoiceFromJob(jobId: string) {
    try {
      const data = await edgeRequest(fn('invoices'), {
        method: 'POST',
        body: JSON.stringify({ jobId }),
      });
      const num = (data as any)?.invoice?.number || '';
      toast.success(num ? `Invoice ${num} created` : 'Invoice created');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to create invoice');
    }
  }

  function handleEmptyDoubleClick(e: React.MouseEvent<HTMLDivElement>, day: Date) {
    const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = clamp(e.clientY - bounds.top, 0, bounds.height);
    const minsFromTop = y / bounds.height * TOTAL_MIN;
    const startBlock = Math.round(minsFromTop / 15) * 15; // snap 15m

    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const minuteOfDay = minuteOfDayFromAnchorOffset(startBlock);
    start.setMinutes(minuteOfDay);

    const end = new Date(start.getTime() + 60 * 60 * 1000); // default 60m
    setPendingSlot({ start, end });
    setPickerOpen(true);
  }

function onDragStart(e: React.PointerEvent, job: Job) {
    e.stopPropagation();
    if (job.status !== 'Scheduled') {
      toast.info('You cannot reschedule this job while it is ' + job.status.toLowerCase());
      setActiveJob(job);
      return;
    }
    const original = { ...job };
    const dur = new Date(job.endsAt).getTime() - new Date(job.startsAt).getTime();
    let latest = { startsAt: job.startsAt, endsAt: job.endsAt };
    const startX = e.clientX;
    const startY = e.clientY;
    let movedEnough = false;

    const onMove = (ev: PointerEvent) => {
      const dx = Math.abs(ev.clientX - startX);
      const dy = Math.abs(ev.clientY - startY);
      if (!movedEnough && Math.sqrt(dx*dx + dy*dy) < 4) return; // threshold to distinguish click vs drag
      movedEnough = true;

      // Determine which day column we're over
      let idx = -1;
      for (let i = 0; i < dayRefs.current.length; i++) {
        const r = dayRefs.current[i]?.getBoundingClientRect();
        if (r && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
          idx = i; break;
        }
      }
      if (idx === -1) {
        // Fallback to original job day index
        const startDate = new Date(original.startsAt);
        const base = new Date(weekStart); base.setHours(0,0,0,0);
        idx = Math.max(0, Math.min(6, Math.floor((startDate.getTime() - base.getTime()) / (24*3600*1000))));
      }
      const dayEl = dayRefs.current[idx];
      if (!dayEl) return;
      const rect = dayEl.getBoundingClientRect();
      const y = clamp(ev.clientY - rect.top, 0, rect.height);
      const minsFromTop = y / rect.height * TOTAL_MIN;
      const rounded = Math.round(minsFromTop / 15) * 15; // snap 15m
      const d = new Date(days[idx]);
      d.setHours(0, 0, 0, 0);
      const minuteOfDay = minuteOfDayFromAnchorOffset(rounded);
      d.setMinutes(minuteOfDay);
      const end = new Date(d.getTime() + dur);
      latest = { startsAt: d.toISOString(), endsAt: end.toISOString() };
      // Optimistic update - the real update happens in onUp
    };

    const onUp = async () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      if (!movedEnough) {
        setActiveJob(job);
        return;
      }
      try {
        await updateJob.mutateAsync({
          id: job.id,
          customerId: job.customerId,
          startsAt: latest.startsAt,
          endsAt: latest.endsAt,
        });
      } catch (err: any) {
        console.error(err);
        // Error handling is already in the mutation
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function onResizeStart(e: React.PointerEvent, job: Job) {
    e.stopPropagation();
    if (job.status !== 'Scheduled') {
      toast.info('You cannot change duration for a job that is ' + job.status.toLowerCase());
      return;
    }
    const original = { ...job };
    let latestEnd = job.endsAt;
    const onMove = (ev: PointerEvent) => {
      // Determine which day column we're over
      let idx = -1;
      for (let i = 0; i < dayRefs.current.length; i++) {
        const r = dayRefs.current[i]?.getBoundingClientRect();
        if (r && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) { idx = i; break; }
      }
      if (idx === -1) return;
      const dayEl = dayRefs.current[idx];
      if (!dayEl) return;
      const rect = dayEl.getBoundingClientRect();
      const y = clamp(ev.clientY - rect.top, 0, rect.height);
      const minsFromTop = y / rect.height * TOTAL_MIN;
      const rounded = Math.round(minsFromTop / 15) * 15; // snap 15m

      const d = new Date(days[idx]);
      d.setHours(0,0,0,0);
      const newEnd = new Date(d);
      newEnd.setMinutes(minuteOfDayFromAnchorOffset(rounded));

      const minEnd = new Date(new Date(job.startsAt).getTime() + 15*60*1000);
      latestEnd = newEnd < minEnd ? minEnd.toISOString() : newEnd.toISOString();
      // Optimistic update - the real update happens in onUp
    };

    const onUp = async () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      try {
        await updateJob.mutateAsync({
          id: job.id,
          customerId: job.customerId,
          endsAt: latestEnd,
        });
      } catch (err: any) {
        console.error(err);
        // Error handling is already in the mutation
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
  return <div className="w-full -ml-4 md:-ml-6 w-[calc(100%+1rem)] md:w-[calc(100%+1.5rem)]">
      <div className="flex items-center justify-end mb-3">
        
      </div>
      {/* Mobile-friendly scroll wrapper */}
      <div className="md:overflow-visible overflow-x-auto -mx-2 md:mx-0">
        <div className="px-2 md:px-0 min-w-[900px] md:min-w-0">
          {/* Day headers */}
          <div className="grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-1 mb-2">
            <div />
            {days.map(day => {
            const isToday = isSameDay(day, now);
            return <div key={day.toISOString()} className={`${isToday ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-foreground'} rounded-md px-2 py-2 text-sm font-medium`}>
                  <div className="flex items-baseline justify-between">
                    <span>{day.toLocaleDateString(undefined, {
                    weekday: 'short'
                  })}</span>
                    <span>{day.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                  })}</span>
                  </div>
                </div>;
          })}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] gap-1">
            <div className="text-xs text-muted-foreground">
              {Array.from({ length: 25 }, (_, i) => (START_ANCHOR_HOUR + i) % 24).map(h => (
                <div key={h + '-' + Math.random()} className="h-16 pr-2 text-right">{h}:00</div>
              ))}
            </div>
            {days.map((day, i) => (
              <div
                key={day.toISOString()}
                className="border rounded-md p-2 relative overflow-hidden"
                ref={(el) => { if (el) dayRefs.current[i] = el; }}
                onDoubleClick={(e) => handleEmptyDoubleClick(e, day)}
              >
                {/* Weekend shading */}
                {(day.getDay() === 0 || day.getDay() === 6) && <div className="absolute inset-0 bg-muted/20 pointer-events-none" />}
                {/* transparent overlay */}
                <div className="absolute inset-2" style={{ background: 'transparent' }} />
                {/* hour lines */}
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-t border-dashed" style={{ top: `${i / 24 * 100}%` }} />
                ))}
                {/* current time line */}
                {(() => {
                  if (!isSameDay(day, now)) return null;
                  const mins = minutesFromAnchor(now);
                  const top = mins / TOTAL_MIN * 100;
                  return (
                    <div className="absolute left-2 right-2" style={{ top: `${top}%` }}>
                      <div className="h-px bg-destructive" />
                      <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-destructive" />
                    </div>
                  );
                })()}
                {/* jobs */}
                {dayJobs[dayKey(day)]?.map(j => {
                  const start = new Date(j.startsAt);
                  const end = new Date(j.endsAt);
                  const top = minutesFromAnchor(start) / TOTAL_MIN * 100;
                  const minutesDuration = Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
                  const height = Math.max(8, minutesDuration / TOTAL_MIN * 100);
                  const customer = customers.find(c => c.id === j.customerId)?.name ?? 'Customer';
                  const color = j.status === 'Scheduled' ? 'bg-primary/10 border-primary' : j.status === 'In Progress' ? 'bg-background border-primary' : 'bg-success/10 border-success';
                  return (
                    <div key={j.id} className={`absolute left-2 right-2 border rounded-md px-2 py-1 text-xs ${color} ${highlightJobId === j.id ? 'ring-2 ring-primary' : ''}`}
                      style={{ top: `${top}%`, height: `${height}%` }}
                      onPointerDown={(e) => onDragStart(e, j)}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="truncate font-medium">{(j as any).title || 'Job'}</div>
                        <div className="opacity-70 whitespace-nowrap">{new Date(j.startsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
                      </div>
                      <div className="truncate text-muted-foreground">{customer}</div>
                      <div className="absolute bottom-0 right-0 w-2 h-2 bg-primary rounded-sm cursor-ns-resize" onPointerDown={(e) => { e.stopPropagation(); onResizeStart(e as any, j); }} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {activeJob && (
        <JobShowModal
          open={true}
          onOpenChange={(o)=>{ if(!o) setActiveJob(null); }}
          job={activeJob}
        />
      )}

      <PickQuoteModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={async (quoteId) => {
          await createJobFromQuote(quoteId);
        }}
      />
    </div>;
  }
