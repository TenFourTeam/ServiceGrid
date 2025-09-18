import { useMemo, useState } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { useJobsData, useCustomersData } from "@/queries/unified";
import { formatMoney } from "@/utils/format";
import { safeCreateDate, filterJobsWithValidDates } from "@/utils/validation";
import JobShowModal from "@/components/Jobs/JobShowModal";
import { JobBottomModal } from "@/components/Jobs/JobBottomModal";
import type { Job } from "@/types";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { getJobStatusColors } from "@/utils/jobStatus";

export default function DayCalendar({ date, displayMode = 'scheduled' }: { date: Date; displayMode?: 'scheduled' | 'clocked' | 'combined'; }) {
  const { data: allJobs } = useJobsData();
  const { data: customers } = useCustomersData();
  const { role } = useBusinessContext();
  
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);
  
  const jobs = useMemo(() => {
    // Filter jobs with valid dates first
    const validJobs = filterJobsWithValidDates(allJobs);
    
    return validJobs
      .filter(j => {
        if (!j.startsAt) return false;
        const jobStart = safeCreateDate(j.startsAt);
        if (!jobStart) return false;
        return jobStart >= dayStart && jobStart <= dayEnd;
      })
      .sort((a, b) => {
        const dateA = safeCreateDate(a.startsAt);
        const dateB = safeCreateDate(b.startsAt);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
      });
  }, [allJobs, dayStart, dayEnd]);
  
  const customersMap = useMemo(() => new Map(customers.map(c => [c.id, c.name])), [customers]);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [open, setOpen] = useState(false);
  const [newJobOpen, setNewJobOpen] = useState(false);

  const handleDayClick = () => {
    if (role === 'owner') {
      setNewJobOpen(true);
    }
  };
  
  return (
    <section className="rounded-lg border p-3" onClick={handleDayClick}>
      <h2 className="sr-only">Day view</h2>
      {jobs.length === 0 && (
        <p className="text-sm opacity-70">No jobs scheduled for this day.</p>
      )}
      <ul className="space-y-2">
        {jobs.flatMap((j) => {
          const blocks: JSX.Element[] = [];
          
          // Scheduled time block
          if (displayMode === 'scheduled' || displayMode === 'combined') {
            const s = safeCreateDate(j.startsAt);
            const e = safeCreateDate(j.endsAt);
            if (!s) return []; // Skip if invalid start date
            const statusColors = getJobStatusColors((j as Job).status, (j as Job).isAssessment);
            
            blocks.push(
              <li key={`${(j as Job).id}-scheduled`} className={`${statusColors.bg} ${statusColors.text} ${statusColors.border} rounded px-3 py-2 border ${displayMode === 'combined' ? 'opacity-60' : ''} cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary`} onClick={() => { setActiveJob(j as Job); setOpen(true); }}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className={`inline-block h-2 w-2 rounded-full ${(j as Job).isAssessment ? 'bg-status-assessment-foreground' : (j as Job).status === 'Completed' ? 'bg-success' : 'bg-primary'}`} aria-hidden="true" />
                  <span>{s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  <span className="opacity-70">–</span>
                  <span>{e ? e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'End time'}</span>
                  {(j as Job).isAssessment && <span className="text-xs opacity-80">(Assessment)</span>}
                  {displayMode === 'combined' && <span className="text-xs opacity-60">(Scheduled)</span>}
                </div>
                <div className="text-sm font-medium truncate">{(j as Job).title || 'Job'}</div>
                <div className="text-xs opacity-70 truncate">{(customersMap.get((j as Job).customerId) ?? 'Customer') as string}</div>
                {(j as Job).address && <div className="text-xs opacity-70">{(j as Job).address}</div>}
              </li>
            );
          }
          
          // Clocked time block
          if ((displayMode === 'clocked' || displayMode === 'combined') && j.clockInTime && j.clockOutTime) {
            const clockStart = safeCreateDate(j.clockInTime);
            const clockEnd = safeCreateDate(j.clockOutTime);
            if (!clockStart || !clockEnd) return []; // Skip if invalid dates
            const liClasses = `rounded px-3 py-2 bg-[hsl(var(--clocked-time))] text-[hsl(var(--clocked-time-foreground))] border border-[hsl(var(--clocked-time))]`;
            
            blocks.push(
              <li key={`${(j as Job).id}-clocked`} className={`${liClasses} cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary`} onClick={() => { setActiveJob(j as Job); setOpen(true); }}>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span className="inline-block h-2 w-2 rounded-full bg-white" aria-hidden="true" />
                  <span>{clockStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  <span className="opacity-70">–</span>
                  <span>{clockEnd.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  <span className="text-xs opacity-80">(Worked)</span>
                </div>
                <div className="text-sm font-medium truncate">{(j as Job).title || 'Job'}</div>
                <div className="text-xs text-white/70 truncate">{(customersMap.get((j as Job).customerId) ?? 'Customer') as string}</div>
                {(j as Job).address && <div className="text-xs text-white/70">{(j as Job).address}</div>}
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