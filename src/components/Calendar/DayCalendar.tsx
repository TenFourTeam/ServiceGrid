import { useMemo, useState } from "react";
import { endOfDay, startOfDay } from "date-fns";
import { useSupabaseJobs } from "@/hooks/useSupabaseJobs";
import { useSupabaseCustomers } from "@/hooks/useSupabaseCustomers";
import { formatMoney } from "@/utils/format";
import JobShowModal from "@/components/Jobs/JobShowModal";
import type { Job } from "@/types";

export default function DayCalendar({ date }: { date: Date }) {
  const { data: jobsData } = useSupabaseJobs();
  const { data: customersData } = useSupabaseCustomers();
  const allJobs = jobsData?.rows || [];
  const customers = customersData?.rows || [];
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
  return (
    <section className="rounded-lg border p-3">
      <h2 className="sr-only">Day view</h2>
      {jobs.length === 0 && (
        <p className="text-sm opacity-70">No jobs scheduled for this day.</p>
      )}
      <ul className="space-y-2">
        {jobs.map((j) => {
          const s = new Date(j.startsAt);
          const e = new Date(j.endsAt);
          const status = j.status;
          const liClasses = `rounded px-3 py-2 bg-background/60 border ${status === 'Completed' ? 'border-success bg-success/5' : status === 'In Progress' ? 'border-primary' : 'border-primary/50'}`;
          const dotClass = status === 'Completed' ? 'bg-success' : 'bg-primary';
          return (
            <li key={j.id} className={`${liClasses} cursor-pointer hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary`} onClick={() => { setActiveJob(j as Job); setOpen(true); }}>
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} aria-hidden="true" />
                <span>{s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                <span className="opacity-70">–</span>
                <span>{e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <div className="text-sm font-medium truncate">{j.title || 'Job'}</div>
              <div className="text-xs text-muted-foreground truncate">{customersMap.get(j.customerId) || 'Customer'}</div>
              {j.address && <div className="text-xs text-muted-foreground">{j.address}</div>}
            </li>
          );
        })}
        </ul>
        {activeJob && (
          <JobShowModal
            open={open}
            onOpenChange={(v) => { setOpen(v); if (!v) setActiveJob(null); }}
            job={activeJob as any}
          />
        )}
      </section>
  );
}
