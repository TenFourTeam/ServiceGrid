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

import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import ReschedulePopover from '@/components/WorkOrders/ReschedulePopover';
import JobShowModal from '@/components/Jobs/JobShowModal';
import { JobBottomModal } from '@/components/Jobs/JobBottomModal';
import { JobEditModal } from '@/components/Jobs/JobEditModal';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { WorkOrderActions } from '@/components/WorkOrders/WorkOrderActions';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { format } from 'date-fns';
import { formatMoney as formatCurrency } from '@/utils/format';

const statusColors: Record<string, string> = {
  'Scheduled': 'bg-green-100 text-green-800',
  'In Progress': 'bg-blue-100 text-blue-800',
  'Completed': 'bg-gray-100 text-gray-800'
};

function useFilteredJobs() {
  const { data: jobs = [] } = useJobsData();
  const { data: customers = [] } = useCustomersData();
  const { data: invoices = [] } = useInvoicesData();
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'all' | 'unscheduled' | 'today' | 'upcoming' | 'completed'>('all');
  const [tableSort, setTableSort] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
  const sevenDaysAgo = new Date(Date.now() - 7*24*3600*1000);

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
    let list = jobs.slice();
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
    }
    if (qLower) {
      list = list.filter(j => {
        const c = customers.find(c=>c.id===j.customerId);
        const customer = c?.name?.toLowerCase() || '';
        const addr = (j.address || c?.address || '').toLowerCase();
        return customer.includes(qLower) || addr.includes(qLower);
      });
    }

    // Apply table sorting for desktop view
    if (tableSort) {
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
          case 'status':
            aValue = a.status || '';
            bValue = b.status || '';
            break;
          case 'amount':
            aValue = a.total || 0;
            bValue = b.total || 0;
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
  }, [jobs, customers, sort, q, tableSort]);

  const counts = useMemo(() => ({
    all: jobs.length,
    unscheduled: jobs.filter(j => !isValidDate(j.startsAt)).length,
    today: jobs.filter(j => j.status !== 'Completed' && isValidDate(j.startsAt) && new Date(j.startsAt!) >= todayStart && new Date(j.startsAt!) <= todayEnd).length,
    upcoming: jobs.filter(j => j.status !== 'Completed' && isValidDate(j.startsAt) && new Date(j.startsAt!) > todayEnd).length,
    completed: jobs.filter(j => j.status === 'Completed' && isValidDate(j.startsAt) && new Date(j.startsAt!) >= sevenDaysAgo).length,
  }), [jobs]);

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

  return { q, setQ, sort, setSort, jobs: filtered, counts, hasInvoice, getInvoiceForJob, tableSort, handleTableSort };
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

function WorkOrderRow({ job, uninvoiced, customerName, when, onOpen, onOpenJobEditModal, t, userRole, existingInvoice }: {
  job: Job;
  uninvoiced: boolean;
  customerName: string;
  when: string;
  onOpen: () => void;
  onOpenJobEditModal?: (job: Job) => void;
  t: (key: string) => string;
  userRole: string;
  existingInvoice?: any;
}) {
  const statusKey = job.status === 'Scheduled' ? 'workOrders.status.scheduled' 
    : job.status === 'In Progress' ? 'workOrders.status.inProgress'
    : 'workOrders.status.completed';

  return (
    <div 
      onClick={onOpen} 
      className="relative p-4 border rounded-md bg-card shadow-sm cursor-pointer hover:bg-accent/30 transition-colors"
    >
      {/* Status badge in top-right corner */}
      <div className="absolute top-2 right-2">
        <Badge className={statusColors[job.status]}>
          {t(statusKey)}
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
          <div className="flex items-center gap-2 mb-1">
            <div className="font-medium truncate">{job.title || t('jobs.form.titlePlaceholder')}</div>
            <div className="text-sm text-muted-foreground">{formatMoney(job.total || 0)}</div>
            {uninvoiced && job.status==='Completed' && <Badge variant="secondary">{t('workOrders.badges.uninvoiced')}</Badge>}
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
  const { isSignedIn, getToken } = useClerkAuth();
  const { isLoading, error } = useJobsData();
  const { q, setQ, sort, setSort, jobs, counts, hasInvoice, tableSort, handleTableSort } = useFilteredJobs();
  const navigate = useNavigate();
  const lastSyncKeyRef = useRef<string | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [showEditJob, setShowEditJob] = useState(false);
  const [selectedEditJob, setSelectedEditJob] = useState<Job | null>(null);
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
            <CardTitle>{t('workOrders.allWorkOrders')}</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button 
                onClick={async () => {
                  if (!isSignedIn) {
                    toast.error('Please sign in to send confirmations');
                    return;
                  }

                  try {
                    toast.loading('Sending tomorrow\'s confirmations...');
                    
                    const token = await getToken();
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
              >
                Send Tomorrow's Confirmations
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
                <option value="completed">{t('workOrders.filters.completed')} ({counts.completed})</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {isMobile ? (
          // Mobile/Tablet Card View
          <Card>
            <CardContent className="p-3 space-y-3">
              {isLoading && jobs.length === 0 ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-sm text-muted-foreground p-8 text-center">{t('workOrders.empty.noJobs')}</div>
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
                    />
                  );
                })
              )}
            </CardContent>
          </Card>
        ) : (
          // Desktop Table View
          <Card>
            <CardContent className="p-0">
              {isLoading && jobs.length === 0 ? (
                <div className="p-6 space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : jobs.length === 0 ? (
                <div className="text-sm text-muted-foreground p-8 text-center">{t('workOrders.empty.noJobs')}</div>
              ) : (
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
                        onClick={() => handleTableSort('status')}
                      >
                        {t('workOrders.table.status')} {tableSort?.column === 'status' && (tableSort.direction === 'asc' ? '▲' : '▼')}
                      </TableHead>
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
                            <StatusChip status={j.status} t={t} />
                          </TableCell>
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
        )}
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
