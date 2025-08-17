import { useMemo, useState } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { useJobsData, useCustomersData } from "@/queries/unified";
import { formatMoney } from "@/utils/format";
import JobShowModal from "@/components/Jobs/JobShowModal";
import { JobBottomModal } from "@/components/Jobs/JobBottomModal";
import type { Job } from "@/types";

export default function DayCalendar({ date, displayMode = 'scheduled' }: { date: Date; displayMode?: 'scheduled' | 'clocked' | 'combined'; }) {
  const { data: allJobs } = useJobsData();
  const { data: customers } = useCustomersData();
  
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  
  const jobs = useMemo(() => {
    return allJobs
      .filter(j => {
        if (!j.startsAt) return false;
        const jobStart = new Date(j.startsAt);
        return jobStart >= dayStart && jobStart <= dayEnd;
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  }, [allJobs, dayStart, dayEnd]);
  
  const customersMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [open, setOpen] = useState(false);
  const [newJobOpen, setNewJobOpen] = useState(false);

  const handleDayDoubleClick = () => {
    setNewJobOpen(true);
  };
  
  return (
    <section className="rounded-lg border p-3" onDoubleClick={handleDayDoubleClick}>
      <h2 className="sr-only">Day view</h2>
      {jobs.length === 0 && (
        <p className="text-sm opacity-70">No jobs scheduled for this day.</p>
      )}
      <ul className="space-y-2">
        {jobs.flatMap((j) => {
          const blocks: JSX.Element[] = [];
          
          // Scheduled time block
          if (displayMode === 'scheduled' || displayMode === 'combined') {
            const s = new Date(j.startsAt);
            const e = new Date(j.endsAt);
            const status = j.status;
            const liClasses = `rounded px-3 py-2 bg-background/60 border ${status === 'Completed' ? 'border-success bg-success/5' : status === 'In Progress' ? 'border-primary' : 'border-primary/50'} ${displayMode === 'combined' ? 'opacity-60' : ''}`;
            const dotClass = status === 'Completed' ? 'bg-success' : 'bg-primary';
            
            blocks.push(
              <li key={`${j.id}-scheduled`} className={`${liClasses} cursor-pointer hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary`} onClick={() => { setActiveJob(j as Job); setOpen(true); }}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
                  <span>{s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  <span className="opacity-70">–</span>
                  <span>{e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  {displayMode === 'combined' && <span className="text-xs opacity-60">(Scheduled)</span>}
                </div>
                <div className="text-sm font-medium truncate">{j.title || 'Job'}</div>
                <div className="text-xs text-muted-foreground truncate">{customersMap.get(j.customerId) || 'Customer'}</div>
                {j.address && <div className="text-xs text-muted-foreground">{j.address}</div>}
              </li>
            );
          }
          
          // Clocked time block
          if ((displayMode === 'clocked' || displayMode === 'combined') && j.clockInTime && j.clockOutTime) {
            const clockStart = new Date(j.clockInTime);
            const clockEnd = new Date(j.clockOutTime);
            const liClasses = `rounded px-3 py-2 bg-[hsl(var(--clocked-time))] text-[hsl(var(--clocked-time-foreground))] border border-[hsl(var(--clocked-time))]`;
            
            blocks.push(
              <li key={`${j.id}-clocked`} className={`${liClasses} cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary`} onClick={() => { setActiveJob(j as Job); setOpen(true); }}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="inline-block h-2 w-2 rounded-full bg-white" aria-hidden="true" />
                  <span>{clockStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  <span className="opacity-70">–</span>
                  <span>{clockEnd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  <span className="text-xs opacity-80">(Worked)</span>
                </div>
                <div className="text-sm font-medium truncate">{j.title || 'Job'}</div>
                <div className="text-xs text-white/70 truncate">{customersMap.get(j.customerId) || 'Customer'}</div>
                {j.address && <div className="text-xs text-white/70">{j.address}</div>}
              </li>
            );
          }
          
          return blocks;
        })}
        </ul>
        {activeJob && (
          <JobShowModal
            open={open}
            onOpenChange={(v) => { setOpen(v); if (!v) setActiveJob(null); }}
            job={activeJob as any}
          />
        )}
        
        <JobBottomModal
          open={newJobOpen}
          onOpenChange={setNewJobOpen}
          initialDate={date}
          initialStartTime="09:00"
          initialEndTime="10:00"
          onJobCreated={() => setNewJobOpen(false)}
        />
      </section>
  );
}