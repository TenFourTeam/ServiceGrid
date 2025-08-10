import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekCalendar } from "@/components/Calendar/WeekCalendar";
import MonthCalendar from "@/components/Calendar/MonthCalendar";
import DayCalendar from "@/components/Calendar/DayCalendar";
import { useMemo, useState, useEffect, useCallback } from "react";
import { addMonths, startOfDay, addDays, format, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
export default function CalendarShell({
  selectedJobId
}: {
  selectedJobId?: string;
}) {
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const month = useMemo(() => new Date(date), [date]);
  const rangeTitle = useMemo(() => {
    if (view === "month") return format(date, "MMMM yyyy");
    if (view === "week") {
      const s = startOfWeek(date);
      const e = endOfWeek(date);
      return s.getMonth() === e.getMonth()
        ? `${format(s, "MMM d")}–${format(e, "d, yyyy")}`
        : `${format(s, "MMM d")}–${format(e, "MMM d, yyyy")}`;
    }
    return format(date, "EEE, MMM d");
  }, [date, view]);

  // Keyboard shortcuts: 1/2/3 to switch views, T for today, arrows to navigate
  const stepDate = useCallback((dir: 1 | -1) => {
    if (view === "month") setDate(addMonths(date, dir));else if (view === "week") setDate(addDays(date, 7 * dir));else setDate(addDays(date, dir));
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
  return <div className="flex flex-col gap-4">
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
        <div>
          <h2 className="text-sm md:text-base font-semibold">{rangeTitle}</h2>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" aria-label="Previous" onClick={() => stepDate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" aria-label="Next" onClick={() => stepDate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <div className="md:hidden">
        <Tabs value={view} onValueChange={(v) => setView(v as any)}>
          <TabsList>
            <TabsTrigger value="day">D</TabsTrigger>
            <TabsTrigger value="week">W</TabsTrigger>
            <TabsTrigger value="month">M</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-[260px_1fr_280px]">
        <aside className="hidden md:block rounded-lg border p-3 bg-card" aria-label="Mini month navigator">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => d && setDate(startOfDay(d))}
            className="w-full"
          />
        </aside>
        {/* Main calendar area */}
        <main className="min-h-[60vh]" role="grid">
          {view === "month" && <MonthCalendar date={date} onDateChange={setDate} />}
          {view === "week" && <WeekCalendar selectedJobId={selectedJobId} />}
          {view === "day" && <DayCalendar date={date} />}
        </main>

        {/* Right rail (search/shortcuts placeholder) */}
        
      </div>
    </div>;
}