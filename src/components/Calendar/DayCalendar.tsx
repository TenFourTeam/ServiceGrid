import { endOfDay, startOfDay } from "date-fns";
import { useSupabaseJobsRange } from "@/hooks/useSupabaseJobsRange";
import type { DbJobRow } from "@/hooks/useSupabaseJobs";
import { formatMoney } from "@/utils/format";

export default function DayCalendar({ date }: { date: Date }) {
  const range = { start: startOfDay(date), end: endOfDay(date) };
  const { data } = useSupabaseJobsRange(range);
  const jobs: DbJobRow[] = (data?.rows ?? []).slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt));

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
          return (
            <li key={j.id} className="rounded border px-3 py-2 bg-background/60">
              <div className="flex items-center gap-2 text-sm font-medium">
                <span className="inline-block h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                <span>{s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                <span className="opacity-70">–</span>
                <span>{e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <div className="text-xs opacity-80">Job{j.total ? ` — ${formatMoney(j.total)}` : ''}</div>
              {j.address && <div className="text-xs text-muted-foreground">{j.address}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
