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
            <li key={j.id} className="rounded border px-3 py-2">
              <div className="text-sm font-medium">
                {s.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                {" – "}
                {e.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </div>
              <div className="text-xs opacity-80">Job{j.total ? ` — ${formatMoney(j.total)}` : ''}</div>
              {j.address && <div className="text-xs opacity-70">{j.address}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
