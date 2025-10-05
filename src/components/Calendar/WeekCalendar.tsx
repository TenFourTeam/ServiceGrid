import { useEffect, useMemo, useRef, useState } from 'react';
import { Job, JobsCacheData, InvoicesCacheData } from '@/types';
import { useJobsData, useCustomersData } from '@/queries/unified';
import { clamp, formatDateTime, minutesSinceStartOfDay } from '@/utils/format';
import { safeCreateDate, safeToISOString, filterJobsWithValidDates } from '@/utils/validation';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { useIsPhone } from '@/hooks/use-phone';
import { queryKeys } from '@/queries/keys';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer';
import { Textarea } from '@/components/ui/textarea';
// Jobs data now comes from store via dashboard data
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import { JobBottomModal } from '@/components/Jobs/JobBottomModal';
import { supabase } from '@/integrations/supabase/client';
import JobShowModal from '@/components/Jobs/JobShowModal';

import { getJobStatusColors, canDragJob, canResizeJob, validateJobTiming, checkJobTimeConflict } from '@/utils/jobStatus';
const START_ANCHOR_HOUR = 5; // visual start at 5:00
const TOTAL_MIN = 24 * 60;
function dayKey(d: Date) {
  const dayDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const isoString = safeToISOString(dayDate);
  return isoString ? isoString.slice(0, 10) : d.toISOString().slice(0, 10);
}
export function WeekCalendar({
  selectedJobId,
  date,
  displayMode = 'scheduled',
  jobs: propsJobs,
  refetchJobs: propsRefetchJobs,
  selectedMemberId,
}: {
  selectedJobId?: string;
  date?: Date;
  displayMode?: 'scheduled' | 'clocked' | 'combined';
  jobs?: Job[];
  refetchJobs?: () => void;
  selectedMemberId?: string | null;
}) {
  const { businessId, role, userId } = useBusinessContext();
  const { data: allJobs } = useJobsData(businessId);
  const jobs = propsJobs || allJobs;
  
  const { data: customers } = useCustomersData();
  const queryClient = useQueryClient();
  const isPhone = useIsPhone();
  
  const [newJobOpen, setNewJobOpen] = useState(false);
  const [pendingSlot, setPendingSlot] = useState<{ start: Date; end: Date } | null>(null);
  const [previewSlot, setPreviewSlot] = useState<{ start: Date; end: Date; day: string } | null>(null);
  const [modalState, setModalState] = useState<'closed' | 'peek' | 'full'>('closed');
  const notesTimer = useRef<number | null>(null);
  const [highlightJobId, setHighlightJobId] = useState<string | null>(null);
  // Visual feedback state only
  const [isDragging, setIsDragging] = useState<string | null>(null);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const [conflictingJobId, setConflictingJobId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => {
    const initial = (() => {
      if (selectedJobId) {
        const j = jobs.find(j => j.id === selectedJobId);
        if (j) {
          const jobDate = safeCreateDate(j.startsAt);
          return jobDate || new Date();
        }
      }
      return new Date();
    })();
    const day = initial.getDay(); // 0=Sun
    const mondayOffset = (day + 6) % 7; // Monday start
    const monday = new Date(initial);
    monday.setDate(initial.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });
  const days = useMemo(() => {
    if (isPhone) {
      // For phones: show 3 days centered around the current date
      const centerDate = new Date(weekStart);
      const today = new Date();
      
      // If the week contains today, center around today
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      if (today >= weekStart && today <= weekEnd) {
        // Center around today, but ensure we don't go outside the current week
        const dayOfWeek = today.getDay();
        const mondayOffset = (dayOfWeek + 6) % 7; // Days since Monday
        
        let startOffset = Math.max(0, Math.min(4, mondayOffset - 1)); // Show 1 day before, but stay within week
        return Array.from({ length: 3 }, (_, i) => 
          new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + startOffset + i)
        );
      } else {
        // If current week doesn't contain today, show first 3 days of the week
        return Array.from({ length: 3 }, (_, i) => 
          new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)
        );
      }
    } else {
      // For tablets and desktop: show full week (7 days)
      return Array.from({ length: 7 }, (_, i) => 
        new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + i)
      );
    }
  }, [weekStart, isPhone]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [weekStart]);

  // Sync week start when parent date changes
  useEffect(() => {
    if (!date) return;
    const d = new Date(date);
    const day = d.getDay();
    const mondayOffset = (day + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - mondayOffset);
    monday.setHours(0, 0, 0, 0);
    setWeekStart(monday);
  }, [date]);

  const authApi = useAuthApi();
  
  // Jobs data is now loaded via dashboard data in AppLayout
  // No need for separate range fetching

  // Removed aggressive realtime subscription that was causing race conditions
  // React Query will handle cache updates naturally with its staleTime configuration

  const dayJobs = useMemo(() => {
    const map: Record<string, Job[]> = {};
    days.forEach(d => map[dayKey(d)] = []);
    
    // Filter jobs with valid dates first
    const validJobs = filterJobsWithValidDates(jobs);
    
    validJobs.forEach(j => {
      const d = safeCreateDate(j.startsAt);
      if (d) {
        // Team member filter - only for owners with selectedMemberId
        if (selectedMemberId) {
          // Cast to Job type to access properties
          const job = j as Job;
          // Show jobs where the selected member is assigned or is the owner
          const isAssignedToMember = job.assignedMembers?.some(member => member.user_id === selectedMemberId);
          const isOwnedByMember = job.ownerId === selectedMemberId;
          if (!(isAssignedToMember || isOwnedByMember)) return; // Skip if not assigned/owned by selected member
        }
        
        const key = dayKey(d);
        if (map[key]) map[key].push(j as Job);
      }
    });
    return map;
  }, [jobs, selectedMemberId, days]);
  const [activeJob, setActiveJob] = useState<Job | null>(() => selectedJobId ? jobs.find(j => j.id === selectedJobId) as Job ?? null : null);
  const [now, setNow] = useState<Date>(new Date());
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  function isSameDay(a: Date, b: Date) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }
  function formatRangeTitle(ds: Date[]) {
    if (ds.length === 1) return ds[0].toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const first = ds[0];
    const last = ds[ds.length - 1];
    const sameMonth = first.getMonth() === last.getMonth() && first.getFullYear() === last.getFullYear();
    const left = first.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    const right = sameMonth ? last.toLocaleDateString(undefined, {
      day: 'numeric'
    }) : last.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
    return `${left} – ${right}`;
  }
const gridRef = useRef<HTMLDivElement>(null);
const dayRefs = useRef<HTMLDivElement[]>([]);
const minutesFromAnchor = (d: Date) => {
  const m = minutesSinceStartOfDay(d);
  const anchor = START_ANCHOR_HOUR * 60;
  return m >= anchor ? m - anchor : m + (24 * 60 - anchor);
};
const minuteOfDayFromAnchorOffset = (offset: number) => {
  const anchor = START_ANCHOR_HOUR * 60;
  return (anchor + offset) % (24 * 60);
};

  async function createInvoiceFromJob(jobId: string) {
    try {
      const { data: response, error } = await authApi.invoke('invoices-crud', {
        method: 'POST',
        body: { jobId },
        toast: {
          success: 'Invoice created',
          loading: 'Creating invoice...',
          error: 'Failed to create invoice'
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to create invoice');
      }

      // Optimistic update - add invoice to cache immediately
      if (response?.invoice && businessId) {
        queryClient.setQueryData(queryKeys.data.invoices(businessId), (oldData: InvoicesCacheData | undefined) => {
          if (oldData) {
            return {
              ...oldData,
              invoices: [response.invoice, ...oldData.invoices],
              count: oldData.count + 1
            };
          }
          return { invoices: [response.invoice], count: 1 };
        });
      }
    } catch (e: Error | unknown) {
      console.error(e);
    }
  }

  function handleEmptyClick(e: React.MouseEvent<HTMLDivElement>, day: Date) {
    // Only allow owners to create jobs
    if (role !== 'owner') return;
    
    const bounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = clamp(e.clientY - bounds.top, 0, bounds.height);
    const minsFromTop = y / bounds.height * TOTAL_MIN;
    const startBlock = Math.round(minsFromTop / 15) * 15; // snap 15m

    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const minuteOfDay = minuteOfDayFromAnchorOffset(startBlock);
    start.setMinutes(minuteOfDay);

    const end = new Date(start.getTime() + 60 * 60 * 1000); // default 60m
    
    // Set preview slot and peek modal state
    setPreviewSlot({ 
      start, 
      end, 
      day: dayKey(day) 
    });
    setPendingSlot({ start, end });
    setModalState('peek');
    setNewJobOpen(true);
  }

function onDragStart(e: React.PointerEvent, job: Job) {
    // Only allow owners to drag jobs
    if (role !== 'owner') return;
    
    e.stopPropagation();
    const currentTime = new Date();
    if (!canDragJob(job.status, currentTime, new Date(job.startsAt))) {
      toast.info(`Cannot move ${job.status.toLowerCase()} jobs`);
      setActiveJob(job);
      return;
    }
    const dur = new Date(job.endsAt).getTime() - new Date(job.startsAt).getTime();
    let latest = { startsAt: job.startsAt, endsAt: job.endsAt };
    const startX = e.clientX;
    const startY = e.clientY;
    let movedEnough = false;

    // Set visual feedback
    setIsDragging(job.id);

    const onMove = (ev: PointerEvent) => {
      const dx = Math.abs(ev.clientX - startX);
      const dy = Math.abs(ev.clientY - startY);
      if (!movedEnough && Math.sqrt(dx*dx + dy*dy) < 4) return; // threshold to distinguish click vs drag
      movedEnough = true;

      // Determine which day column we're over
      let idx = -1;
      for (let i = 0; i < dayRefs.current.length; i++) {
        const r = dayRefs.current[i]?.getBoundingClientRect();
        if (r && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
          idx = i; break;
        }
      }
      if (idx === -1) {
        // Fallback to original job day index
        const startDate = new Date(job.startsAt);
        const base = new Date(weekStart); base.setHours(0,0,0,0);
        idx = Math.max(0, Math.min(6, Math.floor((startDate.getTime() - base.getTime()) / (24*3600*1000))));
      }
      const dayEl = dayRefs.current[idx];
      if (!dayEl) return;
      const rect = dayEl.getBoundingClientRect();
      const y = clamp(ev.clientY - rect.top, 0, rect.height);
      const minsFromTop = y / rect.height * TOTAL_MIN;
      const rounded = Math.round(minsFromTop / 15) * 15; // snap 15m
      const d = new Date(days[idx]);
      d.setHours(0, 0, 0, 0);
      const minuteOfDay = minuteOfDayFromAnchorOffset(rounded);
      d.setMinutes(minuteOfDay);
      const end = new Date(d.getTime() + dur);
      latest = { startsAt: d.toISOString(), endsAt: end.toISOString() };
      
      // Check for conflicts
      const jobsForConflictCheck = (jobs || []).map(j => ({
        id: j.id,
        start_time: j.startsAt,
        end_time: j.endsAt,
        title: j.title
      }));
      const conflictCheck = checkJobTimeConflict(job.id, d, end, jobsForConflictCheck);
      setConflictingJobId(conflictCheck.hasConflict ? job.id : null);
      
      // Directly update cache for real-time feedback
      const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
      queryClient.setQueryData(queryKey, (old: JobsCacheData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          jobs: old.jobs.map((j: Job) => 
            j.id === job.id 
              ? { ...j, startsAt: latest.startsAt, endsAt: latest.endsAt }
              : j
          )
        };
      });
    };

    const onUp = async () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setIsDragging(null);
      setConflictingJobId(null);
      
      if (!movedEnough) {
        setActiveJob(job);
        return;
      }
      
      // Final conflict check before saving
      const jobsForConflictCheck = (jobs || []).map(j => ({
        id: j.id,
        start_time: j.startsAt,
        end_time: j.endsAt,
        title: j.title
      }));
      const finalConflictCheck = checkJobTimeConflict(
        job.id, 
        new Date(latest.startsAt), 
        new Date(latest.endsAt), 
        jobsForConflictCheck
      );

      if (finalConflictCheck.hasConflict) {
        toast.error(`Cannot schedule job - conflicts with: ${finalConflictCheck.conflicts.map(c => c.title).join(', ')}`);
        
        // Revert the job position
        const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
        queryClient.setQueryData(queryKey, (old: JobsCacheData | undefined) => {
          if (!old) return old;
          return {
            ...old,
            jobs: old.jobs.map((j: Job) => 
              j.id === job.id 
                ? { ...j, startsAt: job.startsAt, endsAt: job.endsAt }
                : j
            )
          };
        });
        return;
      }
      
      try {
        const { error } = await authApi.invoke('jobs-crud', {
          method: 'PUT',
          body: {
            id: job.id,
            startsAt: latest.startsAt,
            endsAt: latest.endsAt,
          },
          toast: {
            success: 'Job rescheduled successfully',
            error: 'Failed to reschedule job'
          }
        });
        
        if (error) {
          throw new Error(error.message || 'Failed to reschedule job');
        }
      } catch (err: Error | unknown) {
        console.error(err);
        // Rollback cache on error
        const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
        queryClient.setQueryData(queryKey, (old: JobsCacheData | undefined) => {
          if (!old) return old;
          return {
            ...old,
            jobs: old.jobs.map((j: Job) => 
              j.id === job.id 
                ? { ...j, startsAt: job.startsAt, endsAt: job.endsAt }
                : j
            )
          };
        });
        // Error already handled by authApi toast
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  function onResizeStart(e: React.PointerEvent, job: Job) {
    e.stopPropagation();
    const currentTime = new Date();
    if (!canResizeJob(job.status, currentTime, new Date(job.startsAt), new Date(job.endsAt))) {
      toast.info(`Cannot resize ${job.status.toLowerCase()} jobs`);
      return;
    }
    let latestEnd = job.endsAt;
    
    // Set visual feedback
    setIsResizing(job.id);
    
    const onMove = (ev: PointerEvent) => {
      // Determine which day column we're over
      let idx = -1;
      for (let i = 0; i < dayRefs.current.length; i++) {
        const r = dayRefs.current[i]?.getBoundingClientRect();
        if (r && ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) { idx = i; break; }
      }
      if (idx === -1) return;
      const dayEl = dayRefs.current[idx];
      if (!dayEl) return;
      const rect = dayEl.getBoundingClientRect();
      const y = clamp(ev.clientY - rect.top, 0, rect.height);
      const minsFromTop = y / rect.height * TOTAL_MIN;
      const rounded = Math.round(minsFromTop / 15) * 15; // snap 15m

      const d = new Date(days[idx]);
      d.setHours(0,0,0,0);
      const newEnd = new Date(d);
      newEnd.setMinutes(minuteOfDayFromAnchorOffset(rounded));

      const minEnd = new Date(new Date(job.startsAt).getTime() + 15*60*1000);
      latestEnd = newEnd < minEnd ? minEnd.toISOString() : newEnd.toISOString();
      
      // Directly update cache for real-time feedback
      const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
      queryClient.setQueryData(queryKey, (old: JobsCacheData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          jobs: old.jobs.map((j: Job) => 
            j.id === job.id 
              ? { ...j, endsAt: latestEnd }
              : j
          )
        };
      });
    };

    const onUp = async () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      setIsResizing(null);
      
      try {
        const { error } = await authApi.invoke('jobs-crud', {
          method: 'PUT',
          body: {
            id: job.id,
            endsAt: latestEnd,
          },
          toast: {
            success: 'Job duration updated successfully',
            error: 'Failed to update job duration'
          }
        });
        
        if (error) {
          throw new Error(error.message || 'Failed to update job duration');
        }
      } catch (err: Error | unknown) {
        console.error(err);
        // Rollback cache on error
        const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
        queryClient.setQueryData(queryKey, (old: JobsCacheData | undefined) => {
          if (!old) return old;
          return {
            ...old,
            jobs: old.jobs.map((j: Job) => 
              j.id === job.id 
                ? { ...j, endsAt: job.endsAt }
                : j
            )
          };
        });
        // Error already handled by authApi toast
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }
  return <div className="w-full">
      {/* Mobile-friendly responsive layout */}
      <div className="w-full">
        <div className="px-2 md:px-0">
          {/* Day headers */}
          <div className={`gap-1 mb-2 ${
            isPhone 
              ? 'grid grid-cols-[40px_repeat(3,minmax(0,1fr))]' 
              : 'grid grid-cols-[48px_repeat(7,minmax(0,1fr))] md:grid-cols-[64px_repeat(7,minmax(0,1fr))]'
          }`}>
            <div />
            {days.map(day => {
            const isToday = isSameDay(day, now);
            const dayISOString = safeToISOString(day) || day.toISOString();
            return <div key={dayISOString} className={`${isToday ? 'bg-primary/10 text-primary' : 'bg-muted/30 text-foreground'} rounded-md px-1 md:px-2 py-2 text-xs md:text-sm font-medium`}>
                  <div className="flex flex-col md:flex-row md:items-baseline md:justify-between">
                    <span className="text-center md:text-left">{day.toLocaleDateString(undefined, {
                    weekday: 'short'
                  })}</span>
                    <span className="text-center md:text-right text-xs">{day.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                  })}</span>
                  </div>
                </div>;
          })}
          </div>

          {/* Calendar grid */}
          <div className={`gap-1 ${
            isPhone 
              ? 'grid grid-cols-[40px_repeat(3,minmax(0,1fr))]' 
              : 'grid grid-cols-[48px_repeat(7,minmax(0,1fr))] md:grid-cols-[64px_repeat(7,minmax(0,1fr))]'
          }`}>
            <div className="text-xs text-muted-foreground">
              {Array.from({ length: 25 }, (_, i) => (START_ANCHOR_HOUR + i) % 24).map(h => (
                <div key={h + '-' + Math.random()} className="h-12 md:h-16 pr-1 md:pr-2 text-right text-xs">{h}:00</div>
              ))}
            </div>
            {days.map((day, i) => {
              const dayISOString = safeToISOString(day) || day.toISOString();
              return (
              <div
                key={dayISOString}
                className="border rounded-md p-2 relative overflow-hidden"
                ref={(el) => { if (el) dayRefs.current[i] = el; }}
                onClick={(e) => handleEmptyClick(e, day)}
              >
                {/* Weekend shading */}
                {(day.getDay() === 0 || day.getDay() === 6) && <div className="absolute inset-0 bg-muted/20 pointer-events-none" />}
                {/* transparent overlay */}
                <div className="absolute inset-2" style={{ background: 'transparent' }} />
                {/* hour lines */}
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} className="absolute left-0 right-0 border-t border-dashed" style={{ top: `${i / 24 * 100}%` }} />
                ))}
                {/* current time line */}
                {(() => {
                  if (!isSameDay(day, now)) return null;
                  const mins = minutesFromAnchor(now);
                  const top = mins / TOTAL_MIN * 100;
                  return (
                    <div className="absolute left-2 right-2" style={{ top: `${top}%` }}>
                      <div className="h-px bg-destructive" />
                      <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-destructive" />
                    </div>
                  );
                })()}
                {/* Jobs rendering */}
                {(() => {
                  const renderJobBlocks = () => {
                    const blocks: JSX.Element[] = [];
                    
                    // Render preview outline if this is the target day
                    if (previewSlot && previewSlot.day === dayKey(day)) {
                      const previewStartMins = minutesFromAnchor(previewSlot.start);
                      const previewDurMins = (previewSlot.end.getTime() - previewSlot.start.getTime()) / (1000 * 60);
                      const previewHeight = previewDurMins / TOTAL_MIN * 100;
                      const previewTop = previewStartMins / TOTAL_MIN * 100;
                      
                      blocks.push(
                        <div
                          key="preview-outline"
                          className="absolute left-2 right-2 rounded-md border-2 border-dashed border-blue-400 bg-blue-50/80 select-none transition-all"
                          style={{
                            top: `${previewTop}%`,
                            height: `${Math.max(previewHeight, 4)}%`,
                            zIndex: 5
                          }}
                        >
                          <div className="flex items-center justify-center h-full">
                            <div className="text-blue-600 text-xs font-medium">
                              {previewSlot.start.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} — 1hr
                            </div>
                          </div>
                          {/* Resize handles */}
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full"></div>
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full"></div>
                        </div>
                      );
                    }
                    
                    dayJobs[dayKey(day)]?.forEach(j => {
                      // Scheduled time block (always shown in 'scheduled' and 'combined' modes)
                      if (displayMode === 'scheduled' || displayMode === 'combined') {
                        const startsAt = safeCreateDate(j.startsAt);
                        const endsAt = safeCreateDate(j.endsAt);
                        
                        if (!startsAt) return; // Only require valid start time
                        
                        // Use default 1-hour duration if endsAt is null
                        const effectiveEndsAt = endsAt || new Date(startsAt.getTime() + 60 * 60 * 1000);
                        const start = minutesFromAnchor(startsAt);
                        const dur = effectiveEndsAt.getTime() - startsAt.getTime();
                        const durMins = dur / (1000 * 60);
                        const height = durMins / TOTAL_MIN * 100;
                        const top = start / TOTAL_MIN * 100;
                        const customer = customers.find(c => c.id === j.customerId);
                        const isHighlighted = highlightJobId === j.id;
                        const isBeingDragged = isDragging === j.id;
                        const isBeingResized = isResizing === j.id;
                        const statusColors = getJobStatusColors(j.status, j.isAssessment, j.jobType);
                        const currentTime = new Date();
                        const canDrag = canDragJob(j.status, currentTime, startsAt);
                        const canResize = canResizeJob(j.status, currentTime, startsAt, effectiveEndsAt);
                        
                        blocks.push(<div
                          key={`${j.id}-scheduled`}
                          className={`absolute left-2 right-2 rounded-md p-2 select-none transition-all ${
                            isHighlighted ? 'ring-2 ring-primary/50 scale-[1.02]' : ''
                          } ${
                            statusColors.bg
                          } ${
                            statusColors.text
                          } ${
                            statusColors.border
                          } ${
                            canDrag ? 'cursor-pointer hover:opacity-80 hover:z-20' : 'cursor-default opacity-90'
                          } ${isBeingDragged ? 'opacity-70 scale-[1.05]' : ''} ${isBeingResized ? 'opacity-70' : ''} ${
                            conflictingJobId === j.id ? 'ring-2 ring-red-500 bg-red-600' : ''
                          } ${displayMode === 'combined' ? 'opacity-70' : ''}`}
                          style={{
                            top: `${top}%`,
                            height: `${Math.max(height, 4)}%`,
                            zIndex: isHighlighted ? 10 : 1
                          }}
                          onPointerDown={canDrag ? (e) => onDragStart(e, j) : undefined}
                          onClick={(e) => { e.stopPropagation(); setActiveJob(j); }}
                        >
                          <div className="flex items-center gap-1 text-xs font-medium leading-tight">
                            {startsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} — {customer?.name || 'Unknown'}
                          </div>
                          <div className="text-xs leading-tight mt-0.5 truncate ml-2.5">{j.title}</div>
                          {j.address && (
                            <div className="text-xs leading-tight mt-0.5 truncate ml-2.5 opacity-70">
                              {j.address}
                            </div>
                          )}
                          <div className="text-xs leading-tight mt-0.5 truncate ml-2.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-current/20">
                              {j.status}
                            </span>
                          </div>
                          {/* Resize handle - only show if resizable */}
                          {canResize && displayMode === 'scheduled' && (
                            <div
                              className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 hover:opacity-100 bg-current/20"
                              onPointerDown={(e) => onResizeStart(e, j)}
                            />
                          )}
                        </div>);
                      }
                      
                      // Clocked time block (shown in 'clocked' and 'combined' modes)
                      if ((displayMode === 'clocked' || displayMode === 'combined') && j.clockInTime) {
                        const clockStart = safeCreateDate(j.clockInTime);
                        if (!clockStart) return; // Skip jobs with invalid clock-in time
                        
                        // Handle active clocking (no clock-out time yet) vs completed work
                        const clockEnd = j.clockOutTime ? safeCreateDate(j.clockOutTime) : now;
                        if (!clockEnd) return; // Skip if we can't determine end time
                        const clockStartMins = minutesFromAnchor(clockStart);
                        const clockDur = clockEnd.getTime() - clockStart.getTime();
                        const clockDurMins = clockDur / (1000 * 60);
                        const clockHeight = clockDurMins / TOTAL_MIN * 100;
                        const clockTop = clockStartMins / TOTAL_MIN * 100;
                        const customer = customers.find(c => c.id === j.customerId);
                        
                        const isActivelyClocked = j.isClockedIn && !j.clockOutTime;
                        
                        blocks.push(<div
                          key={`${j.id}-clocked`}
                          className={`absolute left-2 right-2 rounded-md p-2 select-none transition-all cursor-pointer hover:opacity-80 ${
                            isActivelyClocked 
                              ? 'bg-[hsl(var(--active-clocked-time))] text-[hsl(var(--active-clocked-time-foreground))] border border-[hsl(var(--active-clocked-time))] animate-pulse' 
                              : 'bg-[hsl(var(--clocked-time))] text-[hsl(var(--clocked-time-foreground))] border border-[hsl(var(--clocked-time))]'
                          } ${
                            highlightJobId === j.id ? 'ring-2 ring-primary/50 scale-[1.02]' : ''
                          } ${displayMode === 'combined' ? 'z-10 opacity-75' : ''}`}
                          style={{
                            top: `${clockTop}%`,
                            height: `${Math.max(clockHeight, 4)}%`,
                            zIndex: displayMode === 'combined' ? 10 : (highlightJobId === j.id ? 10 : 2)
                          }}
                          onClick={(e) => { e.stopPropagation(); setActiveJob(j); }}
                        >
                          <div className="flex items-center gap-1 text-xs font-medium leading-tight">
                            {clockStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} — {customer?.name || 'Unknown'}
                          </div>
                          <div className="text-xs leading-tight mt-0.5 truncate ml-2.5">{j.title}</div>
                          <div className="text-xs leading-tight mt-0.5 truncate ml-2.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white/20">
                              {isActivelyClocked ? 'Currently Clocked In' : 'Worked Time'}
                            </span>
                          </div>
                        </div>);
                      }
                    });
                    
                    return blocks;
                  };
                  
                  return renderJobBlocks();
                })()}
              </div>
              );
            })}
          </div>
        </div>
      </div>

      {activeJob && (
        <JobShowModal
          open={true}
          onOpenChange={(o)=>{ if(!o) setActiveJob(null); }}
          job={activeJob}
        />
      )}

      <JobBottomModal
        open={newJobOpen}
        mode={modalState === 'peek' ? 'peek' : 'full'}
        onOpenChange={(open) => { 
          setNewJobOpen(open); 
          if (!open) {
            setPendingSlot(null);
            setPreviewSlot(null);
            setModalState('closed');
          }
        }}
        onModeChange={(mode) => {
          setModalState(mode === 'peek' ? 'peek' : 'full');
        }}
        initialDate={pendingSlot?.start}
        initialStartTime={pendingSlot?.start ? `${pendingSlot.start.getHours().toString().padStart(2, '0')}:${pendingSlot.start.getMinutes().toString().padStart(2, '0')}` : undefined}
        initialEndTime={pendingSlot?.end ? `${pendingSlot.end.getHours().toString().padStart(2, '0')}:${pendingSlot.end.getMinutes().toString().padStart(2, '0')}` : undefined}
        onJobCreated={() => {
          setNewJobOpen(false);
          setPendingSlot(null);
          setPreviewSlot(null);
          setModalState('closed');
        }}
      />
    </div>;
  }
