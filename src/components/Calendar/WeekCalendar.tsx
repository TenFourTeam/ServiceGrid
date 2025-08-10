import { useEffect, useMemo, useRef, useState } from 'react';
import { Job } from '@/types';
import { useStore } from '@/store/useAppStore';
import { clamp, formatDateTime, minutesSinceStartOfDay } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
import { useSupabaseJobsRange } from '@/hooks/useSupabaseJobsRange';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { getClerkTokenStrict } from '@/utils/clerkToken';
import { toast } from 'sonner';
import PickQuoteModal from '@/components/Jobs/PickQuoteModal';
import { supabase } from '@/integrations/supabase/client';
const START_HOUR = 7;
const END_HOUR = 19;
const TOTAL_MIN = (END_HOUR - START_HOUR) * 60;
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
  const {
    jobs,
    customers,
    updateJobStatus,
    upsertJob,
    deleteJob
  } = useStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{ start: Date; end: Date } | null>(null);
  const notesTimer = useRef<number | null>(null);
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
  const { data: jobsRange } = useSupabaseJobsRange({ start: weekStart, end: weekEnd }, { enabled: !!isSignedIn });

  useEffect(() => {
    if (jobsRange?.rows) {
      jobsRange.rows.forEach((row) => {
        upsertJob({
          id: row.id,
          customerId: row.customerId,
          quoteId: row.quoteId ?? undefined,
          address: row.address ?? undefined,
          startsAt: row.startsAt,
          endsAt: row.endsAt,
          status: row.status,
          total: row.total ?? undefined,
          notes: row.notes ?? undefined,
          createdAt: row.createdAt,
        });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobsRange]);

  useEffect(() => {
    if (!isSignedIn) return;
    const channel = supabase
      .channel('jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, (payload: any) => {
        try {
          if (payload.eventType === 'DELETE') {
            const id = (payload as any).old?.id as string | undefined;
            if (id) deleteJob(id);
            return;
          }
          const row: any = (payload as any).new;
          if (!row) return;
          upsertJob({
            id: row.id,
            customerId: row.customer_id || row.customerId,
            quoteId: row.quote_id ?? row.quoteId ?? undefined,
            address: row.address ?? undefined,
            startsAt: row.starts_at || row.startsAt,
            endsAt: row.ends_at || row.endsAt,
            status: row.status,
            total: row.total ?? undefined,
            notes: row.notes ?? undefined,
            createdAt: row.created_at || row.createdAt,
          });
        } catch {}
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isSignedIn, upsertJob, deleteJob]);

  const dayJobs = useMemo(() => {
    const map: Record<string, Job[]> = {};
    days.forEach(d => map[dayKey(d)] = []);
    jobs.forEach(j => {
      const d = new Date(j.startsAt);
      const key = dayKey(d);
      if (map[key]) map[key].push(j);
    });
    return map;
  }, [jobs, weekStart]);
  const [activeJob, setActiveJob] = useState<Job | null>(() => selectedJobId ? jobs.find(j => j.id === selectedJobId) ?? null : null);
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

  async function createJobFromQuote(quoteId: string) {
    try {
      if (!pendingSlot) {
        toast.error("No time slot selected");
        return;
      }
      const token = await getClerkTokenStrict(getToken);
      const r = await fetch(
        `https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/jobs`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            quoteId,
            startsAt: pendingSlot.start.toISOString(),
            endsAt: pendingSlot.end.toISOString(),
          }),
        }
      );
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`Failed to create job (${r.status}): ${txt}`);
      }
      const data = await r.json();
      const row: any = data?.row ?? data?.job ?? data;
      const created = {
        id: row.id,
        customerId: row.customerId || row.customer_id,
        quoteId: row.quoteId ?? row.quote_id ?? null,
        address: row.address ?? null,
        startsAt: row.startsAt || row.starts_at,
        endsAt: row.endsAt || row.ends_at,
        status: row.status,
        total: row.total ?? null,
        notes: row.notes ?? null,
        createdAt: row.createdAt || row.created_at,
      } as Job;
      upsertJob(created);
      setActiveJob(created);
      setPickerOpen(false);
      setPendingSlot(null);
      toast.success('Work order created');
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Failed to create job');
    }
  }

  async function createInvoiceFromJob(jobId: string) {
    try {
      const token = await getClerkTokenStrict(getToken);
      const r = await fetch(
        `https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/invoices`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobId }),
        }
      );
      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        throw new Error(`Failed to create invoice (${r.status}): ${txt}`);
      }
      const data = await r.json();
      const num = data?.invoice?.number || '';
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
    start.setMinutes(START_HOUR * 60 + startBlock);

    const end = new Date(start.getTime() + 60 * 60 * 1000); // default 60m
    setPendingSlot({ start, end });
    setPickerOpen(true);
  }

  function onDragStart(e: React.PointerEvent, job: Job) {
    const bounds = (e.currentTarget.parentElement as HTMLElement | null)?.getBoundingClientRect() ?? gridRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const original = { ...job };
    const dur = new Date(job.endsAt).getTime() - new Date(job.startsAt).getTime();
    let latest = { startsAt: job.startsAt, endsAt: job.endsAt };

    const onMove = (ev: PointerEvent) => {
      const y = clamp(ev.clientY - bounds.top, 0, bounds.height);
      const minsFromTop = y / bounds.height * TOTAL_MIN;
      const startMins = Math.round(minsFromTop / 15) * 15 + START_HOUR * 60; // snap 15m
      const d = new Date(original.startsAt);
      d.setHours(0, 0, 0, 0);
      d.setMinutes(startMins);
      const end = new Date(d.getTime() + dur);
      latest = { startsAt: d.toISOString(), endsAt: end.toISOString() };
      upsertJob({
        ...job,
        startsAt: latest.startsAt,
        endsAt: latest.endsAt
      });
    };

    const onUp = async () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      try {
        const token = await getClerkTokenStrict(getToken);
        const r = await fetch(
          `https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/jobs`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ id: job.id, startsAt: latest.startsAt, endsAt: latest.endsAt }),
          }
        );
        if (!r.ok) {
          upsertJob(original);
          const txt = await r.text().catch(() => "");
          throw new Error(`Failed to reschedule (${r.status}): ${txt}`);
        }
        toast.success('Rescheduled');
      } catch (err: any) {
        console.error(err);
        toast.error(err?.message || 'Failed to reschedule');
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
              {Array.from({
              length: END_HOUR - START_HOUR + 1
            }, (_, i) => START_HOUR + i).map(h => <div key={h} className="h-16 pr-2 text-right">{h}:00</div>)}
            </div>
            {days.map(day => <div key={day.toISOString()} className="border rounded-md p-2 relative overflow-hidden" ref={gridRef} onDoubleClick={(e) => handleEmptyDoubleClick(e, day)}>
                {/* Weekend shading */}
                {(day.getDay() === 0 || day.getDay() === 6) && <div className="absolute inset-0 bg-muted/20 pointer-events-none" />}
                {/* transparent overlay */}
                <div className="absolute inset-2" style={{
              background: 'transparent'
            }} />
                {/* hour lines */}
                {Array.from({
              length: END_HOUR - START_HOUR
            }, (_, i) => <div key={i} className="absolute left-0 right-0 border-t border-dashed" style={{
              top: `${i / (END_HOUR - START_HOUR) * 100}%`
            }} />)}
                {/* current time line */}
                {(() => {
              const mins = minutesSinceStartOfDay(now) - START_HOUR * 60;
              if (isSameDay(day, now) && mins >= 0 && mins <= TOTAL_MIN) {
                const top = mins / TOTAL_MIN * 100;
                return <div className="absolute left-2 right-2" style={{
                  top: `${top}%`
                }}>
                        <div className="h-px bg-destructive" />
                        <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-destructive" />
                      </div>;
              }
              return null;
            })()}
                {/* jobs */}
                {dayJobs[dayKey(day)]?.map(j => {
              const start = new Date(j.startsAt);
              const end = new Date(j.endsAt);
              const startMin = minutesSinceStartOfDay(start) - START_HOUR * 60;
              const endMin = minutesSinceStartOfDay(end) - START_HOUR * 60;
              const top = startMin / TOTAL_MIN * 100;
              const height = Math.max(8, (endMin - startMin) / TOTAL_MIN * 100);
              const customer = customers.find(c => c.id === j.customerId)?.name ?? 'Customer';
              const color = j.status === 'Scheduled' ? 'bg-primary/10 border-primary' : j.status === 'In Progress' ? 'bg-accent/10 border-accent' : 'bg-muted/30 border-muted-foreground';
              return <div key={j.id} className={`absolute left-2 right-2 border rounded-md p-2 text-xs select-none cursor-grab active:cursor-grabbing ${color}`} style={{
                top: `${top}%`,
                height: `${height}%`
              }} onPointerDown={e => onDragStart(e, j)} onDoubleClick={(e) => { e.stopPropagation(); setActiveJob(j); }}>
                      <div className="font-medium">{`${j.notes || 'Job'} — ${customer}`}</div>
                      <div className="text-[10px] text-muted-foreground">{formatDateTime(j.startsAt)}</div>
                      <div className="text-[10px]">{j.status}</div>
                    </div>;
            })}
              </div>)}
          </div>
        </div>
      </div>

      <Drawer open={!!activeJob} onOpenChange={o => !o && setActiveJob(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Job Details</DrawerTitle>
          </DrawerHeader>
          {activeJob && <div className="px-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">Customer</div>
                  <div className="font-medium">{customers.find(c => c.id === activeJob.customerId)?.name}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Status</div>
                  <div className="font-medium">{activeJob.status}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Starts</div>
                  <div>{formatDateTime(activeJob.startsAt)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Ends</div>
                  <div>{formatDateTime(activeJob.endsAt)}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Notes</div>
                <Textarea value={activeJob.notes ?? ''} onChange={e => {
              const val = e.target.value;
              const j = {
                ...activeJob,
                notes: val
              };
              setActiveJob(j);
              upsertJob(j);
              if (notesTimer.current) window.clearTimeout(notesTimer.current);
              notesTimer.current = window.setTimeout(async () => {
                try {
                  const token = await getClerkTokenStrict(getToken);
                  await fetch(
                    `https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/jobs`,
                    {
                      method: 'PATCH',
                      headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({ id: activeJob.id, notes: val }),
                    }
                  );
                } catch (err) {
                  // no-op; optimistic update remains
                }
              }, 600) as unknown as number;
            }} />
              </div>
            </div>}
          <DrawerFooter>
            {activeJob && <div className="flex items-center gap-2">
                <Button onClick={() => {
              updateJobStatus(activeJob.id, activeJob.status === 'Scheduled' ? 'In Progress' : 'Completed');
            }}>Advance Status</Button>
                <Button variant="outline" onClick={() => createInvoiceFromJob(activeJob.id)}>Create Invoice</Button>
                <Button variant="secondary" onClick={() => {
              setActiveJob(null);
            }}>Close</Button>
                <Button variant="destructive" onClick={() => {
              deleteJob(activeJob.id);
              setActiveJob(null);
            }}>Delete</Button>
              </div>}
            <DrawerClose />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <PickQuoteModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={async (quoteId) => {
          await createJobFromQuote(quoteId);
        }}
      />
    </div>;
  }