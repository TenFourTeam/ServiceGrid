import { useMemo, useRef, useState } from 'react';
import { Job } from '@/types';
import { useStore } from '@/store/useAppStore';
import { clamp, formatDate, formatDateTime, minutesSinceStartOfDay } from '@/utils/format';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const START_HOUR = 7;
const END_HOUR = 19;
const TOTAL_MIN = (END_HOUR - START_HOUR) * 60;

function dayKey(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10); }

export function WeekCalendar() {
  const { jobs, customers, updateJobStatus, upsertJob, deleteJob } = useStore();
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun
    const mondayOffset = (day + 6) % 7; // Monday start
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    monday.setHours(0,0,0,0);
    return monday;
  });
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i));

  const dayJobs = useMemo(() => {
    const map: Record<string, Job[]> = {};
    days.forEach((d) => (map[dayKey(d)] = []));
    jobs.forEach((j) => {
      const d = new Date(j.startsAt);
      const key = dayKey(d);
      if (map[key]) map[key].push(j);
    });
    return map;
  }, [jobs, weekStart]);

  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  function onDragStart(e: React.PointerEvent, job: Job) {
    const bounds = (e.currentTarget.parentElement as HTMLElement | null)?.getBoundingClientRect() ?? gridRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const original = new Date(job.startsAt);
    const dur = new Date(job.endsAt).getTime() - original.getTime();

    const onMove = (ev: PointerEvent) => {
      const y = clamp(ev.clientY - bounds.top, 0, bounds.height);
      const minsFromTop = (y / bounds.height) * TOTAL_MIN;
      const startMins = Math.round(minsFromTop / 15) * 15 + START_HOUR * 60; // snap 15m
      const d = new Date(original);
      d.setHours(0,0,0,0);
      d.setMinutes(startMins);
      const end = new Date(d.getTime() + dur);
      upsertJob({ ...job, startsAt: d.toISOString(), endsAt: end.toISOString() });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setWeekStart(new Date(weekStart.getTime()-7*24*3600*1000))}>Prev</Button>
          <Button variant="secondary" onClick={() => setWeekStart(new Date())}>Today</Button>
          <Button variant="secondary" onClick={() => setWeekStart(new Date(weekStart.getTime()+7*24*3600*1000))}>Next</Button>
        </div>
        <div className="text-sm text-muted-foreground">{formatDate(days[0].toISOString())} - {formatDate(days[6].toISOString())}</div>
      </div>
      <div className="grid grid-cols-8 gap-2">
        <div className="text-xs text-muted-foreground">
          {Array.from({ length: END_HOUR-START_HOUR + 1 }, (_, i) => START_HOUR + i).map((h) => (
            <div key={h} className="h-16 pr-2 text-right">{h}:00</div>
          ))}
        </div>
        {days.map((day) => (
          <div key={day.toISOString()} className="border rounded-md p-2 relative" ref={gridRef}>
            <div className="absolute inset-2" style={{ background: 'transparent' }} />
            {/* hour lines */}
            {Array.from({ length: END_HOUR-START_HOUR }, (_, i) => (
              <div key={i} className="absolute left-0 right-0 border-t border-dashed" style={{ top: `${(i/(END_HOUR-START_HOUR))*100}%` }} />
            ))}
            {/* jobs */}
            {dayJobs[dayKey(day)]?.map((j) => {
              const start = new Date(j.startsAt);
              const end = new Date(j.endsAt);
              const startMin = minutesSinceStartOfDay(start) - START_HOUR*60;
              const endMin = minutesSinceStartOfDay(end) - START_HOUR*60;
              const top = (startMin / TOTAL_MIN) * 100;
              const height = Math.max(8, ((endMin - startMin) / TOTAL_MIN) * 100);
              const customer = customers.find((c) => c.id === j.customerId)?.name ?? 'Customer';
              const color = j.status === 'Scheduled' ? 'bg-blue-500/20 border-blue-500' : j.status === 'In Progress' ? 'bg-amber-500/20 border-amber-500' : 'bg-emerald-500/20 border-emerald-500';
              return (
                <div key={j.id} className={`absolute left-2 right-2 border rounded-md p-2 text-xs select-none cursor-grab active:cursor-grabbing ${color}`} style={{ top: `${top}%`, height: `${height}%` }}
                  onPointerDown={(e) => onDragStart(e, j)} onDoubleClick={() => setActiveJob(j)}>
                  <div className="font-medium">{customer}</div>
                  <div className="text-[10px] text-muted-foreground">{formatDateTime(j.startsAt)}</div>
                  <div className="text-[10px]">{j.status}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <Drawer open={!!activeJob} onOpenChange={(o) => !o && setActiveJob(null)}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Job Details</DrawerTitle>
          </DrawerHeader>
          {activeJob && (
            <div className="px-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-sm text-muted-foreground">Customer</div>
                  <div className="font-medium">{customers.find(c=>c.id===activeJob.customerId)?.name}</div>
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
                <Textarea value={activeJob.notes ?? ''} onChange={(e)=>{ const j={...activeJob, notes:e.target.value}; setActiveJob(j); upsertJob(j); }} />
              </div>
            </div>
          )}
          <DrawerFooter>
            {activeJob && (
              <div className="flex items-center gap-2">
                <Button onClick={()=>{ updateJobStatus(activeJob.id, activeJob.status==='Scheduled'?'In Progress':'Completed'); }}>Advance Status</Button>
                <Button variant="secondary" onClick={()=>{ setActiveJob(null); }}>Close</Button>
                <Button variant="destructive" onClick={()=>{ deleteJob(activeJob.id); setActiveJob(null); }}>Delete</Button>
              </div>
            )}
            <DrawerClose />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
