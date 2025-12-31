import { useMemo, useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import { useJobsData, useCustomersData, useInvoicesData } from '@/queries/unified';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatMoney } from '@/utils/format';
import { useNavigate } from 'react-router-dom';
import { Job } from '@/types';
import { toast } from 'sonner';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { useAuth } from '@/hooks/useBusinessAuth';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import ReschedulePopover from '@/components/WorkOrders/ReschedulePopover';
import JobShowModal from '@/components/Jobs/JobShowModal';
import { JobBottomModal } from '@/components/Jobs/JobBottomModal';
import { JobEditModal } from '@/components/Jobs/JobEditModal';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plus, List, Map as MapIcon, Columns, MapPin, Route } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { WorkOrderActions } from '@/components/WorkOrders/WorkOrderActions';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { format } from 'date-fns';
import { formatMoney as formatCurrency } from '@/utils/format';
import { LocationFilter } from '@/components/WorkOrders/LocationFilter';
import { WorkOrdersMapView } from '@/components/WorkOrders/WorkOrdersMapView';
import { useJobLocationQuery, type RadiusFilter } from '@/hooks/useJobLocationQuery';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { getJobDisplayName } from '@/utils/jobDisplay';

const statusColors: Record<string, string> = {
  'Scheduled': 'bg-green-100 text-green-800',
  'Schedule Approved': 'bg-green-100 text-green-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  'Completed': 'bg-gray-100 text-gray-800'
};

const typeColors: Record<string, string> = {
  'appointment': 'bg-purple-100 text-purple-800',
  'time_and_materials': 'bg-blue-100 text-blue-800'
};

function useFilteredJobs() {
  const { businessId } = useBusinessContext();
  const { data: jobs = [], isLoading, isError, error } = useJobsData(businessId);
  const { data: customers = [] } = useCustomersData();
  const { data: invoices = [] } = useInvoicesData();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'all' | 'unscheduled' | 'today' | 'upcoming' | 'completed' | 'awaiting-confirmation'>('all');
  const [tableSort, setTableSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);
  const [locationFilter, setLocationFilter] = useState<RadiusFilter | null>(null);

  // Location-based query (only when filter is active)
  const { data: locationData } = useJobLocationQuery(locationFilter, businessId, !!locationFilter);

  const todayStart = useMemo(() => {
    const date = new Date();
    date.setHours(0,0,0,0);
    return date;
  }, []);
  
  const todayEnd = useMemo(() => {
    const date = new Date();
    date.setHours(23,59,59,999);
    return date;
  }, []);
  
  const tomorrowStart = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(0,0,0,0);
    return date;
  }, []);
  
  const tomorrowEnd = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(23,59,59,999);
    return date;
  }, []);
  
  const sevenDaysAgo = useMemo(() => {
    return new Date(Date.now() - 7*24*3600*1000);
  }, []);

  // Helper function to check if a date string is valid
  const isValidDate = (dateStr: string | null | undefined) => {
    if (!dateStr || dateStr === '') return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  // Debug logging - temporary to identify the issue
  console.log('Jobs debug info:', jobs.map(j => ({ 
    id: j.id, 
    status: j.status, 
    startsAt: j.startsAt, 
    startsAtType: typeof j.startsAt,
    isValidDate: isValidDate(j.startsAt)
  })));

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    
    // Start with location-filtered jobs if filter is active
    let list = locationFilter && locationData?.jobs 
      ? locationData.jobs.slice()
      : jobs.slice();

    // Apply status/date filters
    if (sort === 'all') {
      // Show all jobs, no filtering
    } else if (sort === 'unscheduled') {
      list = list.filter(j => !isValidDate(j.startsAt));
    } else if (sort === 'today') {
      list = list.filter(j => j.status !== 'Completed' && isValidDate(j.startsAt) && new Date(j.startsAt!) >= todayStart && new Date(j.startsAt!) <= todayEnd);
    } else if (sort === 'upcoming') {
      list = list.filter(j => j.status !== 'Completed' && isValidDate(j.startsAt) && new Date(j.startsAt!) > todayEnd);
    } else if (sort === 'completed') {
      list = list.filter(j => j.status === 'Completed' && isValidDate(j.startsAt) && new Date(j.startsAt!) >= sevenDaysAgo);
    } else if (sort === 'awaiting-confirmation') {
      list = list.filter(j => 
        j.status === 'Scheduled' && 
        j.confirmationToken && 
        !j.confirmedAt &&
        j.status !== 'Completed'
      );
    }

    // Apply search filter
    if (qLower) {
      list = list.filter(j => {
        const c = customers.find(c=>c.id===j.customerId);
        const customer = c?.name?.toLowerCase() || '';
        const addr = (j.address || c?.address || '').toLowerCase();
        return customer.includes(qLower) || addr.includes(qLower);
      });
    }

    // Apply table sorting (or distance sorting when location filter is active)
    if (locationFilter && !tableSort) {
      // Sort by distance when location filter is active
      list.sort((a, b) => {
        const aDist = (a as any).distance_meters ?? Infinity;
        const bDist = (b as any).distance_meters ?? Infinity;
        return aDist - bDist;
      });
    } else if (tableSort) {
      list.sort((a, b) => {
        let aValue: string | number = '';
        let bValue: string | number = '';

        switch (tableSort.column) {
          case 'title':
            aValue = a.title || '';
            bValue = b.title || '';
            break;
          case 'customer':
            aValue = customers.find(c => c.id === a.customerId)?.name || '';
            bValue = customers.find(c => c.id === b.customerId)?.name || '';
            break;
          case 'scheduled':
            aValue = a.startsAt || '';
            bValue = b.startsAt || '';
            break;
          case 'type':
            aValue = a.jobType || '';
            bValue = b.jobType || '';
            break;
          case 'amount':
            aValue = a.total || 0;
            bValue = b.total || 0;
            break;
          case 'distance':
            aValue = (a as any).distance_meters ?? Infinity;
            bValue = (b as any).distance_meters ?? Infinity;
            break;
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return tableSort.direction === 'asc' ? aValue - bValue : bValue - aValue;
        }

        const comparison = String(aValue).localeCompare(String(bValue));
        return tableSort.direction === 'asc' ? comparison : -comparison;
      });
    }

    return list;
  }, [jobs, locationData, locationFilter, customers, sort, q, tableSort, sevenDaysAgo, todayStart, todayEnd]);

  const counts = useMemo(() => ({
    all: jobs.length,
    unscheduled: jobs.filter(j => !isValidDate(j.startsAt)).length,
    today: jobs.filter(j => j.status !== 'Completed' && isValidDate(j.startsAt) && new Date(j.startsAt!) >= todayStart && new Date(j.startsAt!) <= todayEnd).length,
    upcoming: jobs.filter(j => j.status !== 'Completed' && isValidDate(j.startsAt) && new Date(j.startsAt!) > todayEnd).length,
    completed: jobs.filter(j => j.status === 'Completed' && isValidDate(j.startsAt) && new Date(j.startsAt!) >= sevenDaysAgo).length,
    awaitingConfirmation: jobs.filter(j => 
      j.status === 'Scheduled' && 
      j.confirmationToken && 
      !j.confirmedAt
    ).length,
    tomorrowWithDates: jobs.filter(j => 
      isValidDate(j.startsAt) && 
      new Date(j.startsAt!) >= tomorrowStart && 
      new Date(j.startsAt!) <= tomorrowEnd &&
      !j.confirmationToken
    ).length,
  }), [jobs, sevenDaysAgo, todayStart, todayEnd, tomorrowStart, tomorrowEnd]);

  const hasInvoice = (jobId: string) => invoices.some(i=> i.jobId === jobId);
  const getInvoiceForJob = (jobId: string) => invoices.find(i=> i.jobId === jobId);

  const handleTableSort = (column: string) => {
    setTableSort(prev => {
      if (prev?.column === column) {
        return prev.direction === 'asc' ? { column, direction: 'desc' } : null;
      }
      return { column, direction: 'asc' };
    });
  };

  return { 
    q, setQ, 
    sort, setSort, 
    jobs: filtered, 
    counts, 
    hasInvoice, 
    getInvoiceForJob, 
    tableSort, 
    handleTableSort, 
    isLoading, 
    isError, 
    error,
    locationFilter,
    setLocationFilter
  };
}

function StatusChip({ status, t }: { status: Job['status'], t: (key: string) => string }) {
  const statusKey = status === 'Scheduled' ? 'workOrders.status.scheduled' 
    : status === 'Schedule Approved' ? 'workOrders.status.scheduleApproved'
    : status === 'In Progress' ? 'workOrders.status.inProgress'
    : 'workOrders.status.completed';
  
  const styles = status === 'Scheduled'
    ? 'bg-primary/10 text-primary'
    : status === 'Schedule Approved'
    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300'
    : status === 'In Progress'
    ? 'bg-accent text-accent-foreground'
    : 'bg-muted text-muted-foreground';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles}`}>{t(statusKey)}</span>;
}

function TypeChip({ jobType, t }: { jobType: Job['jobType'], t: (key: string) => string }) {
  const typeKey = jobType === 'time_and_materials' 
    ? 'jobs.types.timeAndMaterials'
    : jobType === 'estimate'
    ? 'jobs.types.estimate'
    : 'jobs.types.appointment';
  
  const styles = jobType === 'time_and_materials'
    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
    : jobType === 'estimate'
    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300';
  
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles}`}>{t(typeKey)}</span>;
}


function WorkOrderRow({ job, uninvoiced, customerName, when, onOpen, onOpenJobEditModal, t, userRole, existingInvoice, distance }: {
  job: Job;
  uninvoiced: boolean;
  customerName: string;
  when: string;
  onOpen: () => void;
  onOpenJobEditModal?: (job: Job) => void;
  t: (key: string) => string;
  userRole: string;
  existingInvoice?: any;
  distance?: number;
}) {
  const typeKey = job.jobType === 'time_and_materials' 
    ? 'jobs.types.timeAndMaterials'
    : 'jobs.types.appointment';

  return (
    <div 
      onClick={onOpen} 
      className="relative p-4 border rounded-md bg-card shadow-sm cursor-pointer hover:bg-accent/30 transition-colors"
    >
      {/* Job type badge in top-right corner */}
      <div className="absolute top-2 right-2">
        <Badge className={typeColors[job.jobType || 'appointment']}>
          {t(typeKey)}
        </Badge>
      </div>
      
      {/* Actions menu halfway up right edge */}
      <div className="absolute top-1/2 right-2 -translate-y-1/2" onClick={(e) => e.stopPropagation()}>
        <WorkOrderActions 
          job={job}
          userRole={userRole}
          onOpenJobEditModal={onOpenJobEditModal}
          existingInvoice={existingInvoice}
        />
      </div>
      
      {/* Content with right padding to avoid overlap */}
      <div className="pr-20 pb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <div className="font-medium truncate">{getJobDisplayName(job)}</div>
            <div className="text-sm text-muted-foreground">{formatMoney(job.total || 0)}</div>
            {uninvoiced && job.status==='Completed' && <Badge variant="secondary">{t('workOrders.badges.uninvoiced')}</Badge>}
            {distance !== undefined && (
              <Badge variant="outline" className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {(distance * 0.000621371).toFixed(1)} mi
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground truncate">{t('workOrders.modal.customer')}: {customerName}</div>
          {job.address && <div className="text-sm text-muted-foreground truncate">{job.address}</div>}
          <div className="text-sm text-muted-foreground mt-1">{when}</div>
        </div>
      </div>
    </div>
  );
}

export default function WorkOrdersPage() {
  const { data: customers = [] } = useCustomersData();
  const { isSignedIn, getToken } = useAuth();
  const { 
    q, setQ, 
    sort, setSort, 
    jobs, 
    counts, 
    hasInvoice, 
    tableSort, 
    handleTableSort, 
    isLoading, 
    isError, 
    error,
    locationFilter,
    setLocationFilter
  } = useFilteredJobs();
  const navigate = useNavigate();
  const lastSyncKeyRef = useRef<string | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [showEditJob, setShowEditJob] = useState(false);
  const [selectedEditJob, setSelectedEditJob] = useState<Job | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map' | 'split'>('list');
  const [isRoutePlanningMode, setIsRoutePlanningMode] = useState(false);
  const isMobile = useIsMobile();
  const { t } = useLanguage();
  const { role } = useBusinessContext();
  const { data: invoices = [] } = useInvoicesData();

  const handleJobEditClick = (job: Job) => {
    setSelectedEditJob(job);
    setShowEditJob(true);
  };

  // Jobs data is now loaded from dashboard data in AppLayout
  // No need for separate data fetching and syncing here

  return (
    <AppLayout title={t('workOrders.title')}>
      <section aria-label="work-orders" className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <CardTitle>{t('workOrders.allWorkOrders')}</CardTitle>
              
              {/* View Mode Toggle - Desktop only */}
              {!isMobile && (
                <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)}>
                  <ToggleGroupItem value="list" aria-label="List view">
                    <List className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="map" aria-label="Map view">
                    <MapIcon className="h-4 w-4" />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="split" aria-label="Split view">
                    <Columns className="h-4 w-4" />
                  </ToggleGroupItem>
                </ToggleGroup>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                onClick={async () => {
                  if (!isSignedIn) {
                    toast.error('Please sign in to send confirmations');
                    return;
                  }

                  try {
                    toast.loading('Sending tomorrow\'s confirmations...');
                    
                    const token = await getToken({ template: 'supabase' });
                    if (!token) {
                      throw new Error('Unable to get authentication token');
                    }

                    const response = await fetch('https://ijudkzqfriazabiosnvb.supabase.co/functions/v1/send-work-order-confirmations', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdWRrenFmcmlhemFiaW9zbnZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ2NzIyNjAsImV4cCI6MjA3MDI0ODI2MH0.HLOwmgddlBTcHfYrX9RYvO8RK6IVkjDQvsdHyXuMXIM'
                      },
                      body: JSON.stringify({
                        type: 'bulk'
                      })
                    });
                    
                    const result = await response.json();
                    
                    if (response.ok) {
                      const processedCount = result.results?.length || 0;
                      const successCount = result.results?.filter((r: any) => r.success)?.length || 0;
                      
                      toast.dismiss();
                      if (successCount > 0) {
                        toast.success(`Successfully sent ${successCount} confirmation${successCount !== 1 ? 's' : ''} for tomorrow's scheduled work orders`);
                      } else {
                        toast.info('No scheduled work orders found for tomorrow that need confirmation');
                      }
                    } else {
                      throw new Error(result.error || 'Failed to send confirmations');
                    }
                  } catch (error) {
                    toast.dismiss();
                    console.error('Failed to send bulk confirmations:', error);
                    toast.error(error instanceof Error ? error.message : 'Failed to send confirmations');
                  }
                }}
                variant="outline"
                className="w-full sm:w-auto"
                disabled={counts.tomorrowWithDates === 0}
                title={counts.tomorrowWithDates === 0 ? "No jobs scheduled for tomorrow with valid dates" : `Send confirmations to ${counts.tomorrowWithDates} scheduled jobs`}
              >
                Send Tomorrow's Confirmations {counts.tomorrowWithDates > 0 ? `(${counts.tomorrowWithDates})` : ''}
              </Button>
              <Button onClick={() => setCreateJobOpen(true)} className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                {t('workOrders.newJob')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-4">
              <Input 
                value={q} 
                onChange={(e)=>setQ(e.target.value)} 
                placeholder={t('workOrders.search.placeholder')} 
                className="w-full sm:flex-1" 
              />
              <select 
                value={sort} 
                onChange={(e)=>setSort(e.target.value as any)} 
                className="w-full sm:w-auto rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="all">{t('workOrders.filters.all')} ({counts.all})</option>
                <option value="unscheduled">{t('workOrders.filters.unscheduled')} ({counts.unscheduled})</option>
                <option value="today">{t('workOrders.filters.today')} ({counts.today})</option>
                <option value="upcoming">{t('workOrders.filters.upcoming')} ({counts.upcoming})</option>
                <option value="awaiting-confirmation">{t('workOrders.filters.awaitingConfirmation')} ({counts.awaitingConfirmation})</option>
                <option value="completed">{t('workOrders.filters.completed')} ({counts.completed})</option>
              </select>
            </div>

            {/* Location Filter - Show in map/split modes or as collapsible on mobile */}
            {isMobile ? (
              <Collapsible className="mb-4">
                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <MapPin className="h-4 w-4 mr-2" />
                    Location Filter {locationFilter && '✓'}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <LocationFilter
                    onFilterChange={setLocationFilter}
                  />
                </CollapsibleContent>
              </Collapsible>
            ) : (viewMode === 'map' || viewMode === 'split') && (
              <LocationFilter
                onFilterChange={setLocationFilter}
                className="mb-4"
              />
            )}
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {/* View Mode Rendering */}
        {isMobile || viewMode === 'list' ? (
          // Mobile/Tablet Card View or Desktop List View
          <Card>
            <CardContent className="p-3 space-y-3">
              {isLoading && jobs.length === 0 ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-sm text-muted-foreground p-8 text-center">
                  {locationFilter 
                    ? 'No jobs found within the selected radius. Try expanding your search area.'
                    : t('workOrders.empty.noJobs')}
                </div>
              ) : isMobile ? (
                jobs.map((j)=>{
                  const customerName = customers.find(c=>c.id===j.customerId)?.name || t('workOrders.modal.customer');
                  const when = j.startsAt ? formatDateTime(j.startsAt) : t('workOrders.time.unscheduled');
                  const uninvoiced = j.status==='Completed' && !hasInvoice(j.id);
                  const existingInvoice = invoices.find(inv => inv.jobId === j.id);
                  return (
                    <WorkOrderRow
                      key={j.id}
                      job={j as Job}
                      customerName={customerName}
                      when={when}
                      uninvoiced={uninvoiced}
                      onOpen={() => setActiveJob(j as Job)}
                      onOpenJobEditModal={handleJobEditClick}
                      t={t}
                      userRole={role || 'member'}
                      existingInvoice={existingInvoice}
                      distance={(j as any).distance_meters}
                    />
                  );
                })
              ) : (
                // Desktop Table View
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleTableSort('title')}
                      >
                        {t('workOrders.table.jobTitle')} {tableSort?.column === 'title' && (tableSort.direction === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleTableSort('customer')}
                      >
                        {t('workOrders.table.customer')} {tableSort?.column === 'customer' && (tableSort.direction === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead>{t('workOrders.table.address')}</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleTableSort('scheduled')}
                      >
                        {t('workOrders.table.scheduled')} {tableSort?.column === 'scheduled' && (tableSort.direction === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleTableSort('type')}
                      >
                        {t('workOrders.table.type')} {tableSort?.column === 'type' && (tableSort.direction === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      {locationFilter && (
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleTableSort('distance')}
                        >
                          Distance {tableSort?.column === 'distance' && (tableSort.direction === 'asc' ? '▲' : '▼')}
                        </TableHead>
                      )}
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleTableSort('amount')}
                      >
                        {t('workOrders.table.amount')} {tableSort?.column === 'amount' && (tableSort.direction === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead className="w-[50px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((j) => {
                      const customer = customers.find(c => c.id === j.customerId);
                      const customerName = customer?.name || t('workOrders.modal.customer');
                      const address = j.address || customer?.address || '';
                      const when = j.startsAt ? formatDateTime(j.startsAt) : t('workOrders.time.unscheduled');
                      const uninvoiced = j.status === 'Completed' && !hasInvoice(j.id);
                      const existingInvoice = invoices.find(inv => inv.jobId === j.id);
                      const distance = (j as any).distance_meters;
                      
                      return (
                        <TableRow 
                          key={j.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setActiveJob(j as Job)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {j.title || t('jobs.form.titlePlaceholder')}
                              {uninvoiced && <Badge variant="secondary">{t('workOrders.badges.uninvoiced')}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{customerName}</TableCell>
                          <TableCell className="max-w-xs truncate">{address}</TableCell>
                          <TableCell>{when}</TableCell>
                          <TableCell>
                            <TypeChip jobType={j.jobType || 'appointment'} t={t} />
                          </TableCell>
                          {locationFilter && (
                            <TableCell>
                              {distance !== undefined ? (
                                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                                  <MapPin className="h-3 w-3" />
                                  {(distance * 0.000621371).toFixed(1)} mi
                                </Badge>
                              ) : '-'}
                            </TableCell>
                          )}
                          <TableCell className="text-right">{formatMoney(j.total || 0)}</TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <WorkOrderActions 
                              job={j as Job}
                              userRole={role || 'member'}
                              onOpenJobEditModal={handleJobEditClick}
                              existingInvoice={existingInvoice}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'map' ? (
          // Full Map View
          <Card className="h-[700px]">
            <CardContent className="p-0 h-full">
              <WorkOrdersMapView
                jobs={jobs as any}
                locationFilter={locationFilter}
                onJobClick={setActiveJob}
              />
            </CardContent>
          </Card>
        ) : viewMode === 'split' ? (
          // Split View - Desktop only
          <Card className="h-[700px]">
            <ResizablePanelGroup direction="horizontal">
              <ResizablePanel defaultSize={40} minSize={30}>
                <CardContent className="p-3 space-y-3 h-full overflow-auto">
                  {isLoading && jobs.length === 0 ? (
                    <div className="space-y-2">
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                      <Skeleton className="h-20 w-full" />
                    </div>
                  ) : jobs.length === 0 ? (
                    <div className="text-sm text-muted-foreground p-8 text-center">
                      {locationFilter 
                        ? 'No jobs found within the selected radius.'
                        : t('workOrders.empty.noJobs')}
                    </div>
                  ) : (
                    jobs.map((j)=>{
                      const customerName = customers.find(c=>c.id===j.customerId)?.name || t('workOrders.modal.customer');
                      const when = j.startsAt ? formatDateTime(j.startsAt) : t('workOrders.time.unscheduled');
                      const uninvoiced = j.status==='Completed' && !hasInvoice(j.id);
                      const existingInvoice = invoices.find(inv => inv.jobId === j.id);
                      return (
                        <WorkOrderRow
                          key={j.id}
                          job={j as Job}
                          customerName={customerName}
                          when={when}
                          uninvoiced={uninvoiced}
                          onOpen={() => setActiveJob(j as Job)}
                          onOpenJobEditModal={handleJobEditClick}
                          t={t}
                          userRole={role || 'member'}
                          existingInvoice={existingInvoice}
                          distance={(j as any).distance_meters}
                        />
                      );
                    })
                  )}
                </CardContent>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={60} minSize={40}>
                <WorkOrdersMapView
                  jobs={jobs as any}
                  locationFilter={locationFilter}
                  onJobClick={setActiveJob}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </Card>
        ) : null}
        {activeJob && (
          <JobShowModal
            open={!!activeJob}
            onOpenChange={(o)=>{ if (!o) setActiveJob(null); }}
            onOpenJobEditModal={handleJobEditClick}
            job={{
              id: activeJob.id,
              customerId: activeJob.customerId,
              startsAt: activeJob.startsAt,
              endsAt: activeJob.endsAt,
              status: activeJob.status,
              notes: activeJob.notes,
              address: activeJob.address,
              total: activeJob.total as any,
              // photos may be undefined here; JobShowModal handles optional
              ...(activeJob as any),
            } as any}
          />
        )}
        <JobBottomModal
          open={createJobOpen}
          onOpenChange={setCreateJobOpen}
          onJobCreated={() => setCreateJobOpen(false)}
        />
        <JobEditModal
          open={showEditJob}
          onOpenChange={setShowEditJob}
          job={selectedEditJob}
        />
      </section>
    </AppLayout>
  );
}
