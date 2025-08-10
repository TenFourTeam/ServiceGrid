import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WeekCalendar } from "@/components/Calendar/WeekCalendar";
import MonthCalendar from "@/components/Calendar/MonthCalendar";
import DayCalendar from "@/components/Calendar/DayCalendar";
import { useMemo, useState } from "react";
import { addMonths, startOfDay } from "date-fns";

export default function CalendarShell({ selectedJobId }: { selectedJobId?: string }) {
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [date, setDate] = useState<Date>(startOfDay(new Date()));

  const month = useMemo(() => new Date(date), [date]);

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
        {/* Left rail (mini calendar) */}
        <aside className="hidden md:block">
          <div className="rounded-lg border">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => d && setDate(startOfDay(d))}
              className="p-2"
            />
          </div>
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
