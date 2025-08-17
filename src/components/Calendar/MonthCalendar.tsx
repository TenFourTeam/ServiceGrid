
import { useMemo, useState } from "react";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { useJobsData, useCustomersData } from "@/queries/unified";
import { formatMoney } from "@/utils/format";
import JobShowModal from "@/components/Jobs/JobShowModal";
import { JobBottomModal } from "@/components/Jobs/JobBottomModal";
import type { Job } from "@/types";

function useMonthGrid(date: Date) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return { start, end, days };
}

export default function MonthCalendar({ date, onDateChange, displayMode = 'scheduled' }: { date: Date; onDateChange: (d: Date) => void; displayMode?: 'scheduled' | 'clocked' | 'combined'; }) {
  const { start, end, days } = useMonthGrid(date);
  const { data: allJobs } = useJobsData();
  const { data: customers } = useCustomersData();
  
  
  const jobs = useMemo(() => {
    return allJobs.filter(j => {
      if (!j.startsAt) return false;
      const jobStart = new Date(j.startsAt);
      return jobStart >= start && jobStart <= end;
    });
  }, [allJobs, start, end]);

  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [open, setOpen] = useState(false);
  const [newJobOpen, setNewJobOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const customersMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);
  const jobsByDay = useMemo(() => {
    const map = new Map<string, Job[]>();
    for (const job of jobs) {
      const s = new Date(job.startsAt);
      const key = s.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job as Job);
    }
    return map;
  }, [jobs]);

  return (
    <section aria-label="Month grid" className="rounded-lg border overflow-hidden">
      <div className="grid grid-cols-7 text-xs font-medium border-b">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => (
          <div key={d} className="px-2 py-2 text-center">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-[minmax(112px,1fr)]">
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10);
          const dayJobs = (jobsByDay.get(key) || []).slice().sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
          const visible = dayJobs.slice(0, 3);
          const overflow = dayJobs.length - visible.length;
          const isToday = isSameDay(d, new Date());
          const inMonth = isSameMonth(d, date);
          return (
            <div
              key={key}
              role="button"
              tabIndex={0}
              onClick={() => onDateChange(d)}
              onDoubleClick={() => { setSelectedDate(d); setNewJobOpen(true); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDateChange(d); } }}
              aria-current={isToday ? 'date' : undefined}
              className={`border p-2 text-left align-top focus:outline-none focus:ring-2 focus:ring-primary ${inMonth ? '' : 'opacity-60'} ${isToday ? 'bg-muted/40' : ''}`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium" aria-label={format(d, 'PPPP')}>{format(d, "d")}</span>
              </div>
              <ul className="space-y-1">
                {visible.map((j) => {
                  const blocks: JSX.Element[] = [];
                  
                  // Scheduled time block
                  if (displayMode === 'scheduled' || displayMode === 'combined') {
                    const t = new Date(j.startsAt);
                    blocks.push(
                      <li key={`${j.id}-scheduled`} className="truncate">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveJob(j as Job); setOpen(true); }}
                          className={`w-full truncate rounded px-2 py-1 text-xs border bg-background/60 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary ${j.status === 'Completed' ? 'border-success bg-success/5' : j.status === 'In Progress' ? 'border-primary' : 'border-primary/50'} ${displayMode === 'combined' ? 'opacity-60' : ''}`}
                          aria-label={`Open job ${j.title || 'Job'} at ${t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                        >
                          <span className={`mr-2 inline-block h-2 w-2 rounded-full align-middle ${j.status === 'Completed' ? 'bg-success' : 'bg-primary'}`} aria-hidden="true" />
                          <span className="font-medium">
                            {t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <span className="mx-1 opacity-70">•</span>
                          <span className="truncate">{j.title || 'Job'}</span>
                          {customersMap.get(j.customerId) && (
                            <span className="opacity-70"> — {customersMap.get(j.customerId)}</span>
                          )}
                          {displayMode === 'combined' && <span className="text-[10px] opacity-60"> (S)</span>}
                        </button>
                      </li>
                    );
                  }
                  
                  // Clocked time block
                  if ((displayMode === 'clocked' || displayMode === 'combined') && j.clockInTime && j.clockOutTime) {
                    const clockStart = new Date(j.clockInTime);
                    blocks.push(
                      <li key={`${j.id}-clocked`} className="truncate">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setActiveJob(j as Job); setOpen(true); }}
                          className="w-full truncate rounded px-2 py-1 text-xs border bg-[hsl(var(--clocked-time))] text-[hsl(var(--clocked-time-foreground))] border-[hsl(var(--clocked-time))] hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary"
                          aria-label={`Open worked time for ${j.title || 'Job'} at ${clockStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`}
                        >
                          <span className="mr-2 inline-block h-2 w-2 rounded-full bg-white align-middle" aria-hidden="true" />
                          <span className="font-medium">
                            {clockStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                          </span>
                          <span className="mx-1 opacity-70">•</span>
                          <span className="truncate">{j.title || 'Job'}</span>
                          {customersMap.get(j.customerId) && (
                            <span className="opacity-70"> — {customersMap.get(j.customerId)}</span>
                          )}
                          <span className="text-[10px] opacity-80"> (W)</span>
                        </button>
                      </li>
                    );
                  }
                  
                  return blocks;
                }).flat() as JSX.Element[]}
                {overflow > 0 && (
                  <li className="text-xs opacity-70">+{overflow} more</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
      {activeJob && (
        <JobShowModal
          open={open}
          onOpenChange={(v) => { setOpen(v); if (!v) setActiveJob(null); }}
          job={activeJob as any}
        />
      )}
      
      <JobBottomModal
        open={newJobOpen}
        onOpenChange={(open) => { setNewJobOpen(open); if (!open) setSelectedDate(null); }}
        initialDate={selectedDate || date}
        initialStartTime="09:00"
        initialEndTime="10:00"
        onJobCreated={() => { setNewJobOpen(false); setSelectedDate(null); }}
      />
    </section>
  );
}
