import { useMemo, useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import { useJobsData, useCustomersData, useInvoicesData } from '@/queries/unified';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

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

function StatusChip({ status }: { status: Job['status'] }) {
  const styles = status === 'Scheduled'
    ? 'bg-primary/10 text-primary'
    : status === 'In Progress'
    ? 'bg-accent text-accent-foreground'
    : 'bg-muted text-muted-foreground';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles}`}>{status}</span>;
}

function WorkOrderRow({ job, uninvoiced, customerName, when, onOpen }: {
  job: Job;
  uninvoiced: boolean;
  customerName: string;
  when: string;
  onOpen: () => void;
}) {
  return (
    <div onClick={onOpen} className="p-4 border rounded-md bg-card shadow-sm cursor-pointer hover:bg-accent/30 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="font-medium truncate">{job.title || 'Job'}</div>
            <div className="text-sm text-muted-foreground">{formatMoney(job.total || 0)}</div>
            {uninvoiced && job.status==='Completed' && <Badge variant="secondary">Uninvoiced</Badge>}
          </div>
          <div className="text-sm text-muted-foreground truncate">Customer: {customerName}</div>
          {job.address && <div className="text-sm text-muted-foreground truncate">{job.address}</div>}
          <div className="text-sm text-muted-foreground mt-1">{when}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusChip status={job.status} />
          <div className="text-xs text-muted-foreground">Click to view details</div>
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
  const isMobile = useIsMobile();

  // Jobs data is now loaded from dashboard data in AppLayout
  // No need for separate data fetching and syncing here

  return (
    <AppLayout title="Work Orders">
      <section aria-label="work-orders" className="space-y-3">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <div className="flex items-center gap-2">
              <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search customer or address" className="h-9 w-48" />
              <select value={sort} onChange={(e)=>setSort(e.target.value as any)} className="h-9 rounded-md border bg-background px-2 text-sm">
                <option value="all">All ({counts.all})</option>
                <option value="unscheduled">Unscheduled ({counts.unscheduled})</option>
                <option value="today">Today ({counts.today})</option>
                <option value="upcoming">Upcoming ({counts.upcoming})</option>
                <option value="completed">Completed ({counts.completed})</option>
              </select>
            </div>
          </div>
        </div>

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
                <div className="text-sm text-muted-foreground p-8 text-center">No jobs in this view.</div>
              ) : (
                jobs.map((j)=>{
                  const customerName = customers.find(c=>c.id===j.customerId)?.name || 'Customer';
                  const when = j.startsAt ? formatDateTime(j.startsAt) : 'Unscheduled';
                  const uninvoiced = j.status==='Completed' && !hasInvoice(j.id);
                  return (
                    <WorkOrderRow
                      key={j.id}
                      job={j as Job}
                      customerName={customerName}
                      when={when}
                      uninvoiced={uninvoiced}
                      onOpen={() => setActiveJob(j as Job)}
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
                <div className="text-sm text-muted-foreground p-8 text-center">No jobs in this view.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleTableSort('title')}
                      >
                        Job Title {tableSort?.column === 'title' && (tableSort.direction === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleTableSort('customer')}
                      >
                        Customer {tableSort?.column === 'customer' && (tableSort.direction === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleTableSort('scheduled')}
                      >
                        Scheduled {tableSort?.column === 'scheduled' && (tableSort.direction === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => handleTableSort('status')}
                      >
                        Status {tableSort?.column === 'status' && (tableSort.direction === 'asc' ? '▲' : '▼')}
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:bg-muted/50 text-right"
                        onClick={() => handleTableSort('amount')}
                      >
                        Amount {tableSort?.column === 'amount' && (tableSort.direction === 'asc' ? '▲' : '▼')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((j) => {
                      const customer = customers.find(c => c.id === j.customerId);
                      const customerName = customer?.name || 'Customer';
                      const address = j.address || customer?.address || '';
                      const when = j.startsAt ? formatDateTime(j.startsAt) : 'Unscheduled';
                      const uninvoiced = j.status === 'Completed' && !hasInvoice(j.id);
                      
                      return (
                        <TableRow 
                          key={j.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => setActiveJob(j as Job)}
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {j.title || 'Job'}
                              {uninvoiced && <Badge variant="secondary">Uninvoiced</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>{customerName}</TableCell>
                          <TableCell className="max-w-xs truncate">{address}</TableCell>
                          <TableCell>{when}</TableCell>
                          <TableCell>
                            <StatusChip status={j.status} />
                          </TableCell>
                          <TableCell className="text-right">{formatMoney(j.total || 0)}</TableCell>
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
      </section>
    </AppLayout>
  );
}
