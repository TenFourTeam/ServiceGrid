import { useMemo } from "react";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { useSupabaseJobsRange } from "@/hooks/useSupabaseJobsRange";
import type { DbJobRow } from "@/hooks/useSupabaseJobs";
import { formatMoney } from "@/utils/format";

function useMonthGrid(date: Date) {
  const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
  const days: Date[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return { start, end, days };
}

export default function MonthCalendar({ date, onDateChange }: { date: Date; onDateChange: (d: Date) => void }) {
  const { start, end, days } = useMonthGrid(date);
  const { data } = useSupabaseJobsRange({ start, end });
  const jobs: DbJobRow[] = data?.rows ?? [];

  const jobsByDay = useMemo(() => {
    const map = new Map<string, DbJobRow[]>();
    for (const job of jobs) {
      const s = parseISO(job.startsAt);
      const key = s.toISOString().slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(job);
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
          const dayJobs = (jobsByDay.get(key) || []).slice().sort((a, b) => a.startsAt.localeCompare(b.startsAt));
          const visible = dayJobs.slice(0, 3);
          const overflow = dayJobs.length - visible.length;
          const isToday = isSameDay(d, new Date());
          const inMonth = isSameMonth(d, date);
          return (
            <button
              key={key}
              onClick={() => onDateChange(d)}
              className={`border p-2 text-left align-top ${inMonth ? '' : 'opacity-60'} ${isToday ? 'bg-muted/40' : ''}`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">{format(d, "d")}</span>
              </div>
              <ul className="space-y-1">
                {visible.map((j) => {
                  const t = new Date(j.startsAt);
                  return (
                    <li key={j.id} className="truncate rounded bg-muted px-2 py-1 text-xs">
                      {t.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      {" "}Job{j.total ? ` — ${formatMoney(j.total)}` : ''}
                    </li>
                  );
                })}
                {overflow > 0 && (
                  <li className="text-xs opacity-70">+{overflow} more</li>
                )}
              </ul>
            </button>
          );
        })}
      </div>
    </section>
  );
}
