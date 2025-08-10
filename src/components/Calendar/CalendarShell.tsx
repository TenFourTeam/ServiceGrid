import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekCalendar } from "@/components/Calendar/WeekCalendar";
import MonthCalendar from "@/components/Calendar/MonthCalendar";
import DayCalendar from "@/components/Calendar/DayCalendar";
import { useMemo, useState, useEffect, useCallback } from "react";
import { addMonths, startOfDay, addDays } from "date-fns";

export default function CalendarShell({ selectedJobId }: { selectedJobId?: string }) {
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [date, setDate] = useState<Date>(startOfDay(new Date()));

  const month = useMemo(() => new Date(date), [date]);

  // Keyboard shortcuts: 1/2/3 to switch views, T for today, arrows to navigate
  const stepDate = useCallback((dir: 1 | -1) => {
    if (view === "month") setDate(addMonths(date, dir));
    else if (view === "week") setDate(addDays(date, 7 * dir));
    else setDate(addDays(date, dir));
  }, [date, view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return;
      if (e.key === '1') setView('day');
      if (e.key === '2') setView('week');
      if (e.key === '3') setView('month');
      if (e.key.toLowerCase() === 't') setDate(startOfDay(new Date()));
      if (e.key === 'ArrowLeft') stepDate(-1);
      if (e.key === 'ArrowRight') stepDate(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stepDate]);

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setDate(startOfDay(new Date()))}>
            Today
          </Button>
          <div className="hidden md:block">
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList>
                <TabsTrigger value="day">Day</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="month">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDate(addMonths(date, -1))}>
            ◀
          </Button>
          <div className="text-sm font-medium" aria-live="polite">
            {month.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDate(addMonths(date, 1))}>
            ▶
          </Button>
        </div>
        <div className="md:hidden">
          <Tabs value={view} onValueChange={(v) => setView(v as any)}>
            <TabsList>
              <TabsTrigger value="day">D</TabsTrigger>
              <TabsTrigger value="week">W</TabsTrigger>
              <TabsTrigger value="month">M</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-[260px_1fr_280px]">
        {/* Left rail (mini calendar + scheduling) */}
        <aside className="hidden md:block">
          <div className="rounded-lg border">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(startOfDay(d))}
              className="p-2"
            />
          </div>
          <section className="mt-3 rounded-lg border p-3">
            <h2 className="text-sm font-medium mb-2">Scheduling</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-primary" aria-hidden="true"/> Crew Alpha</span>
                <span className="opacity-70">on</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-secondary" aria-hidden="true"/> Crew Beta</span>
                <span className="opacity-70">on</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-accent" aria-hidden="true"/> Crew Gamma</span>
                <span className="opacity-70">on</span>
              </li>
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">Crew filters coming soon.</p>
          </section>
        </aside>

        {/* Main calendar area */}
        <main className="min-h-[60vh]" role="grid">
          {view === "month" && <MonthCalendar date={date} onDateChange={setDate} />}
          {view === "week" && <WeekCalendar selectedJobId={selectedJobId} />}
          {view === "day" && <DayCalendar date={date} />}
        </main>

        {/* Right rail (search/shortcuts placeholder) */}
        <aside className="hidden md:block">
          <section className="rounded-lg border p-3">
            <h2 className="text-sm font-medium">Search</h2>
            <p className="text-xs opacity-70">Coming soon: search titles, customers, addresses.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
