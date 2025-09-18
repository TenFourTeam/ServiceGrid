import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeekCalendar } from "@/components/Calendar/WeekCalendar";
import MonthCalendar from "@/components/Calendar/MonthCalendar";
import DayCalendar from "@/components/Calendar/DayCalendar";
import { useMemo, useState, useEffect, useCallback } from "react";
import { addMonths, startOfDay, addDays, format, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useJobsData } from "@/hooks/useJobsData";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsPhone } from "@/hooks/use-phone";
type CalendarDisplayMode = 'scheduled' | 'clocked' | 'combined';

export default function CalendarShell({
  selectedJobId
}: {
  selectedJobId?: string;
}) {
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>('scheduled');
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const { data: jobs, refetch: refetchJobs } = useJobsData();
  const isMobile = useIsMobile();
  const isPhone = useIsPhone();
  
  const month = useMemo(() => new Date(date), [date]);
  const rangeTitle = useMemo(() => {
    if (view === "month") return format(date, "MMMM yyyy");
    if (view === "week") {
      const s = startOfWeek(date);
      const e = endOfWeek(date);
      return s.getMonth() === e.getMonth() ? `${format(s, "MMM d")}–${format(e, "d, yyyy")}` : `${format(s, "MMM d")}–${format(e, "MMM d, yyyy")}`;
    }
    return format(date, "EEE, MMM d");
  }, [date, view]);

  // Keyboard shortcuts: 1/2/3 to switch views, T for today, arrows to navigate
  const stepDate = useCallback((dir: 1 | -1) => {
    if (view === "month") {
      setDate(addMonths(date, dir));
    } else if (view === "week") {
      // For phone in week view, navigate by 1 day to slide the 3-day window
      // For tablet/desktop, navigate by full week (7 days)
      const step = (isPhone && view === "week") ? 1 : 7;
      setDate(addDays(date, step * dir));
    } else {
      setDate(addDays(date, dir));
    }
  }, [date, view, isPhone]);
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
  return <div className="flex-1 min-h-0 flex flex-col gap-2 md:gap-4">
        <header className="flex flex-col gap-3 md:gap-0 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between md:gap-3">
            <h2 className={`font-semibold ${isPhone ? 'text-base' : 'text-lg md:text-base'}`}>
              {rangeTitle}
            </h2>
            {isMobile && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  size={isPhone ? "touch" : "sm"} 
                  aria-label="Previous" 
                  onClick={() => stepDate(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {isPhone && <span className="sr-only">Previous</span>}
                </Button>
                <Button 
                  variant="secondary" 
                  size={isPhone ? "touch" : "sm"} 
                  aria-label="Next" 
                  onClick={() => stepDate(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                  {isPhone && <span className="sr-only">Next</span>}
                </Button>
              </div>
            )}
          </div>
          
          <div className={`flex items-center justify-between md:justify-end ${isPhone ? 'gap-2' : 'gap-2'}`}>
            <Select value={displayMode} onValueChange={v => setDisplayMode(v as CalendarDisplayMode)}>
              <SelectTrigger className={isPhone ? "w-[100px] text-xs" : "w-[120px] md:w-[140px]"}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">
                  {isPhone ? "Sched" : "Scheduled"}
                </SelectItem>
                <SelectItem value="clocked">
                  {isPhone ? "Clock" : "Clocked"}
                </SelectItem>
                <SelectItem value="combined">
                  {isPhone ? "Both" : "Combined"}
                </SelectItem>
              </SelectContent>
            </Select>
            
            <Tabs value={view} onValueChange={v => setView(v as any)}>
              <TabsList className={`grid w-full grid-cols-3 ${isPhone ? 'h-8' : ''}`}>
                <TabsTrigger 
                  value="day" 
                  className={`${isPhone ? 'text-xs px-1' : 'text-xs md:text-sm px-2 md:px-3'}`}
                >
                  {isMobile ? "D" : "Day"}
                </TabsTrigger>
                <TabsTrigger 
                  value="week" 
                  className={`${isPhone ? 'text-xs px-1' : 'text-xs md:text-sm px-2 md:px-3'}`}
                >
                  {isMobile ? "W" : "Week"}
                </TabsTrigger>
                <TabsTrigger 
                  value="month" 
                  className={`${isPhone ? 'text-xs px-1' : 'text-xs md:text-sm px-2 md:px-3'}`}
                >
                  {isMobile ? "M" : "Month"}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            <Button 
              variant="secondary" 
              size={isPhone ? "md" : "sm"} 
              onClick={() => setDate(startOfDay(new Date()))}
              className={isPhone ? "px-3" : ""}
            >
              {isPhone ? "Now" : "Today"}
            </Button>
            
            {!isMobile && (
              <>
                <Button variant="secondary" size="sm" aria-label="Previous" onClick={() => stepDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" aria-label="Next" onClick={() => stepDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </header>

      <div className="flex-1 min-h-0 grid gap-4 md:grid-cols-1">
        
        {/* Main calendar area */}
        <main className="h-full min-h-0" role="grid">
          {view === "month" && <MonthCalendar date={date} onDateChange={setDate} displayMode={displayMode} />}
          {view === "week" && <WeekCalendar selectedJobId={selectedJobId} date={date} displayMode={displayMode} jobs={jobs} refetchJobs={refetchJobs} />}
          {view === "day" && <DayCalendar date={date} displayMode={displayMode} />}
        </main>

        {/* Right rail (search/shortcuts placeholder) */}
        
      </div>
    </div>;
}