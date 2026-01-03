import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/Button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeekCalendar } from "@/components/Calendar/WeekCalendar";
import MonthCalendar from "@/components/Calendar/MonthCalendar";
import DayCalendar from "@/components/Calendar/DayCalendar";
import { RouteMapView } from "@/components/Calendar/RouteMapView";
import { useMemo, useState, useEffect, useCallback, lazy, Suspense } from "react";
import { addMonths, startOfDay, addDays, format, startOfWeek, endOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight, Map, Sparkles, FileText } from "lucide-react";
import { OverviewGenerator, ArtifactsViewer } from '@/components/AI';
import { useJobsData } from "@/hooks/useJobsData";
import { useBusinessMembersData } from "@/hooks/useBusinessMembers";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsPhone } from "@/hooks/use-phone";
import { useLanguage } from "@/contexts/LanguageContext";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
type CalendarDisplayMode = 'scheduled' | 'clocked' | 'combined';

export default function CalendarShell({
  selectedJobId,
  businessId: routeBusinessId
}: {
  selectedJobId?: string;
  businessId?: string;
}) {
  const [view, setView] = useState<"month" | "week" | "day">("week");
  const [showMap, setShowMap] = useState(false);
  const [displayMode, setDisplayMode] = useState<CalendarDisplayMode>('scheduled');
  const [date, setDate] = useState<Date>(startOfDay(new Date()));
  const [showOverviewGenerator, setShowOverviewGenerator] = useState(false);
  const [showArtifactsViewer, setShowArtifactsViewer] = useState(false);
  const [showProvisioningFallback, setShowProvisioningFallback] = useState(false);
  const { role, userId, businessId, businessName, isLoadingBusiness, refetchBusiness, hasBusinessError } = useBusinessContext(routeBusinessId);
  const { data: jobs, refetch: refetchJobs } = useJobsData(businessId);
  const { data: businessMembers } = useBusinessMembersData();
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const isMobile = useIsMobile();
  const isPhone = useIsPhone();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

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

  const stepDate = useCallback((dir: 1 | -1) => {
    if (view === "month") {
      setDate(addMonths(date, dir));
    } else if (view === "week") {
      const step = (isPhone && view === "week") ? 1 : 7;
      setDate(addDays(date, step * dir));
    } else {
      setDate(addDays(date, dir));
    }
  }, [date, view, isPhone]);

  // ALL useEffects BEFORE any early returns to comply with React's Rules of Hooks
  useEffect(() => {
    if (!businessId) return;
    console.log("[CalendarShell] Business changed, clearing jobs cache for:", businessId);
    queryClient.removeQueries({ queryKey: ['data', 'jobs'] });
  }, [businessId, queryClient]);

  useEffect(() => {
    if (!businessId) return;
    console.log("[CalendarShell] Business context changed:", {
      businessId,
      businessName,
      role,
      userId,
      memberCount: businessMembers?.length || 0,
      memberNames: businessMembers?.map(m => m.name || m.email) || []
    });
  }, [businessId, businessName, role, userId, businessMembers]);

  useEffect(() => {
    if (!userId || !businessMembers?.length) return;
    if (selectedMemberId === null) {
      const currentUser = businessMembers.find(member => member.user_id === userId);
      if (currentUser) setSelectedMemberId(userId);
    }
  }, [userId, selectedMemberId, businessMembers]);

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

  // Business provisioning fallback - show after 5s when truly stuck
  useEffect(() => {
    // Only trigger fallback when loading is complete but business is still missing
    if (!isLoadingBusiness && !businessId) {
      const timer = setTimeout(() => {
        console.warn('[CalendarShell] Business context not resolved after 5s');
        setShowProvisioningFallback(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
    // Reset fallback state when business becomes available
    if (businessId) {
      setShowProvisioningFallback(false);
    }
  }, [isLoadingBusiness, businessId]);

  // Business error state - show error UI with retry
  if (hasBusinessError) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-8">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
            <span className="text-destructive text-xl">!</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Unable to load business data</h2>
          <p className="text-muted-foreground">There was a problem loading your workspace. Please try again.</p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => refetchBusiness?.()} variant="primary">
              Retry
            </Button>
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground underline">
              Sign out and try again
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Skeleton loading state - AFTER all hooks
  if (isLoadingBusiness || !businessId) {
    // Show provisioning fallback after timeout
    if (showProvisioningFallback) {
      return (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md p-8">
            <h2 className="text-xl font-semibold text-foreground">Setting up your workspace...</h2>
            <p className="text-muted-foreground">This should only take a moment. If this persists, try refreshing.</p>
            <Button onClick={() => refetchBusiness?.()} variant="secondary">
              Retry
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        <header className="pt-6 flex items-center justify-between">
          <Skeleton className="h-7 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-20" />
          </div>
        </header>
        <div className="flex-1 grid grid-cols-7 gap-px bg-muted/30 rounded-lg overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-background p-2 min-h-[120px]">
              <Skeleton className="h-5 w-10 mb-3" />
              <Skeleton className="h-16 w-full rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }
  return <div className="flex-1 min-h-0 flex flex-col gap-2 md:gap-4">
        <header className="pt-4 md:pt-6 flex flex-col gap-3 md:gap-0 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center justify-between md:gap-3">
            <h2 className={`font-semibold ${isPhone ? 'text-base' : 'text-lg md:text-base'}`}>
              {rangeTitle}
            </h2>
            {isMobile && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary" 
                  size={isPhone ? "touch" : "sm"} 
                  aria-label={t('calendar.navigation.previous')} 
                  onClick={() => stepDate(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {isPhone && <span className="sr-only">{t('calendar.navigation.previous')}</span>}
                </Button>
                <Button 
                  variant="secondary" 
                  size={isPhone ? "touch" : "sm"} 
                  aria-label={t('calendar.navigation.next')} 
                  onClick={() => stepDate(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                  {isPhone && <span className="sr-only">{t('calendar.navigation.next')}</span>}
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
                  {isPhone ? t('calendar.displayModes.scheduledShort') : t('calendar.displayModes.scheduled')}
                </SelectItem>
                <SelectItem value="clocked">
                  {isPhone ? t('calendar.displayModes.clockedShort') : t('calendar.displayModes.clocked')}
                </SelectItem>
                <SelectItem value="combined">
                  {isPhone ? t('calendar.displayModes.combinedShort') : t('calendar.displayModes.combined')}
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Team Member Selector - Only for owners */}
            {role === 'owner' && (
              <Select value={selectedMemberId || 'all'} onValueChange={v => setSelectedMemberId(v === 'all' ? null : v)}>
                <SelectTrigger className={isPhone ? "w-[100px] text-xs" : "w-[120px] md:w-[140px]"}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {businessMembers.map((member) => (
                    <SelectItem key={member.user_id} value={member.user_id}>
                      {member.name || member.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            
            {/* Generate Overview Button */}
            <Button 
              variant="secondary"
              size={isPhone ? "md" : "sm"}
              onClick={() => setShowOverviewGenerator(true)}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              {!isPhone && <span>Overview</span>}
            </Button>
            
            {/* AI Documents Button */}
            {role === 'owner' && (
              <Button 
                variant="secondary"
                size={isPhone ? "md" : "sm"}
                onClick={() => setShowArtifactsViewer(true)}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                {!isPhone && <span>AI Docs</span>}
              </Button>
            )}
            
            {/* Map Toggle - Separate from time views */}
            <Button 
              variant={showMap ? "primary" : "secondary"} 
              size={isPhone ? "md" : "sm"}
              onClick={() => setShowMap(!showMap)}
              className={isPhone ? "px-2" : ""}
            >
              <Map className="h-4 w-4" />
              {!isPhone && <span className="ml-2">Map</span>}
            </Button>
            
            {/* Time-based View Tabs - Hidden when map is shown */}
            {!showMap && (
              <Tabs value={view} onValueChange={v => setView(v as any)}>
                <TabsList className={`grid w-full grid-cols-3 ${isPhone ? 'h-8' : ''}`}>
                  <TabsTrigger 
                    value="day" 
                    className={`${isPhone ? 'text-xs px-1' : 'text-xs md:text-sm px-2 md:px-3'}`}
                  >
                    {isMobile ? t('calendar.views.dayShort') : t('calendar.views.day')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="week" 
                    className={`${isPhone ? 'text-xs px-1' : 'text-xs md:text-sm px-2 md:px-3'}`}
                  >
                    {isMobile ? t('calendar.views.weekShort') : t('calendar.views.week')}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="month" 
                    className={`${isPhone ? 'text-xs px-1' : 'text-xs md:text-sm px-2 md:px-3'}`}
                  >
                    {isMobile ? t('calendar.views.monthShort') : t('calendar.views.month')}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}
            
            <Button 
              variant="secondary" 
              size={isPhone ? "md" : "sm"} 
              onClick={() => setDate(startOfDay(new Date()))}
              className={isPhone ? "px-3" : ""}
            >
              {isPhone ? t('calendar.navigation.now') : t('calendar.navigation.today')}
            </Button>
            
            {!isMobile && (
              <>
                <Button variant="secondary" size="sm" aria-label={t('calendar.navigation.previous')} onClick={() => stepDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="sm" aria-label={t('calendar.navigation.next')} onClick={() => stepDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        </header>

      <div className="flex-1 min-h-0 grid gap-4 md:grid-cols-1">
        
        {/* Main calendar area */}
        <main className="h-full min-h-0" role="grid">
          {showMap ? (
            <Suspense fallback={
              <div className="w-full h-full flex items-center justify-center bg-muted/10">
                <div className="space-y-4 w-full max-w-md p-8">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-64 w-full" />
                  <Skeleton className="h-8 w-1/2" />
                </div>
              </div>
            }>
              <div className="h-full w-full min-h-[600px]">
                <RouteMapView 
                  date={date} 
                  jobs={jobs} 
                  selectedMemberId={selectedMemberId}
                />
              </div>
            </Suspense>
          ) : (
            <>
              {view === "month" && <MonthCalendar date={date} onDateChange={setDate} displayMode={displayMode} selectedMemberId={selectedMemberId} />}
              {view === "week" && <WeekCalendar selectedJobId={selectedJobId} date={date} displayMode={displayMode} jobs={jobs} refetchJobs={refetchJobs} selectedMemberId={selectedMemberId} />}
              {view === "day" && <DayCalendar date={date} displayMode={displayMode} selectedMemberId={selectedMemberId} />}
            </>
          )}
        </main>

        {/* Right rail (search/shortcuts placeholder) */}
        
      </div>
      
      <OverviewGenerator
        open={showOverviewGenerator}
        onOpenChange={setShowOverviewGenerator}
        defaultDateRange={view === 'week' ? { start: startOfWeek(date), end: endOfWeek(date) } : undefined}
      />
      <ArtifactsViewer
        open={showArtifactsViewer}
        onOpenChange={setShowArtifactsViewer}
      />
    </div>;
}