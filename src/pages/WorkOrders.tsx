import { useMemo, useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import { useStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatMoney } from '@/utils/format';
import { useNavigate } from 'react-router-dom';
import { Job } from '@/types';
import { toast } from '@/components/ui/use-toast';
import { useSupabaseJobs } from '@/hooks/useSupabaseJobs';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { edgeFetchJson } from '@/utils/edgeApi';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import ReschedulePopover from '@/components/WorkOrders/ReschedulePopover';
import JobShowModal from '@/components/Jobs/JobShowModal';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

function useFilteredJobs() {
  const { jobs, customers, invoices } = useStore();
  const [filter, setFilter] = useState<'unscheduled' | 'today' | 'upcoming' | 'completed'>('unscheduled');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'when' | 'customer' | 'amount'>('when');

  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
  const sevenDaysAgo = new Date(Date.now() - 7*24*3600*1000);

  const filtered = useMemo(() => {
    const qLower = q.trim().toLowerCase();
    let list = jobs.slice();
    if (filter === 'unscheduled') {
      list = list.filter(j => !j.startsAt);
    } else if (filter === 'today') {
      list = list.filter(j => j.status !== 'Completed' && new Date(j.startsAt) >= todayStart && new Date(j.startsAt) <= todayEnd);
    } else if (filter === 'upcoming') {
      list = list.filter(j => j.status !== 'Completed' && new Date(j.startsAt) > todayEnd);
    } else if (filter === 'completed') {
      list = list.filter(j => j.status === 'Completed' && new Date(j.startsAt) >= sevenDaysAgo);
    }
    if (qLower) {
      list = list.filter(j => {
        const c = customers.find(c=>c.id===j.customerId);
        const customer = c?.name?.toLowerCase() || '';
        const addr = (j.address || c?.address || '').toLowerCase();
        return customer.includes(qLower) || addr.includes(qLower);
      });
    }
    if (sort === 'when') list.sort((a,b)=> new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    if (sort === 'customer') list.sort((a,b)=> (customers.find(c=>c.id===a.customerId)?.name || '').localeCompare(customers.find(c=>c.id===b.customerId)?.name || ''));
    if (sort === 'amount') list.sort((a,b)=> (b.total||0) - (a.total||0));
    return list;
  }, [jobs, customers, filter, q, sort]);

  const counts = useMemo(() => ({
    unscheduled: jobs.filter(j => !j.startsAt).length,
    today: jobs.filter(j => j.status !== 'Completed' && new Date(j.startsAt) >= todayStart && new Date(j.startsAt) <= todayEnd).length,
    upcoming: jobs.filter(j => j.status !== 'Completed' && new Date(j.startsAt) > todayEnd).length,
    completed: jobs.filter(j => j.status === 'Completed' && new Date(j.startsAt) >= sevenDaysAgo).length,
  }), [jobs]);

  const hasInvoice = (jobId: string) => invoices.some(i=> i.jobId === jobId);
  const getInvoiceForJob = (jobId: string) => invoices.find(i=> i.jobId === jobId);

  return { filter, setFilter, q, setQ, sort, setSort, jobs: filtered, counts, hasInvoice, getInvoiceForJob };
}

function StatusChip({ status }: { status: Job['status'] }) {
  const styles = status === 'Scheduled'
    ? 'bg-primary/10 text-primary'
    : status === 'In Progress'
    ? 'bg-accent text-accent-foreground'
    : 'bg-muted text-muted-foreground';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles}`}>{status}</span>;
}

function WorkOrderRow({ job, onRescheduled, onComplete, onInvoice, onViewInvoice, onNavigate, uninvoiced, customerName, when, onOpen }: {
  job: Job;
  onRescheduled: () => void | Promise<void>;
  onComplete: () => void;
  onInvoice: () => void;
  onViewInvoice?: () => void;
  onNavigate: () => void;
  uninvoiced: boolean;
  customerName: string;
  when: string;
  onOpen: () => void;
}) {
  return (
    <div onClick={onOpen} className="p-3 border rounded-md bg-card shadow-sm cursor-pointer hover:bg-accent/30 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium truncate">{job.title || 'Job'}</div>
            <div className="text-sm text-muted-foreground">{formatMoney(job.total || 0)}</div>
            {uninvoiced && job.status==='Completed' && <Badge variant="secondary">Uninvoiced</Badge>}
          </div>
          <div className="text-xs text-muted-foreground truncate">Customer: {customerName}</div>
          {job.address && <div className="text-xs text-muted-foreground truncate">{job.address}</div>}
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground text-right">
            <div>{when}</div>
            <div className="mt-1"><StatusChip status={job.status} /></div>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <div onClick={(e)=>e.stopPropagation()}>
          <ReschedulePopover job={job} onDone={onRescheduled} />
        </div>
        <Button size="sm" onClick={(e)=>{ e.stopPropagation(); onComplete(); }} disabled={job.status === 'Completed'}>Complete</Button>
        {job.status==='Completed' && uninvoiced && <Button size="sm" onClick={(e)=>{ e.stopPropagation(); onInvoice(); }}>Invoice</Button>}
        <Button size="sm" variant="outline" onClick={(e)=>{ e.stopPropagation(); onNavigate(); }}>Navigate</Button>
      </div>
    </div>
  );
}

export default function WorkOrdersPage() {
  const { customers, updateJobStatus, upsertJob } = useStore();
  const { isSignedIn, getToken } = useClerkAuth();
  const { data: jobsData, isLoading, error } = useSupabaseJobs();
  const { filter, setFilter, q, setQ, sort, setSort, jobs, counts, hasInvoice } = useFilteredJobs();
  const navigate = useNavigate();
  const lastSyncKeyRef = useRef<string | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);

  // Jobs data is now loaded from dashboard data in AppLayout
  // No need for separate data fetching and syncing here

  return (
    <AppLayout title="Work Orders">
      <section aria-label="work-orders" className="space-y-3">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            <ToggleGroup type="single" value={filter} onValueChange={(v)=> v && setFilter(v as any)} className="flex flex-wrap justify-start">
              <ToggleGroupItem value="unscheduled" size="sm" aria-label="Unscheduled">
                <span>Unscheduled</span>
                <Badge variant="secondary" className="ml-2">{counts.unscheduled}</Badge>
              </ToggleGroupItem>
              <ToggleGroupItem value="today" size="sm" aria-label="Today">
                <span>Today</span>
                <Badge variant="secondary" className="ml-2">{counts.today}</Badge>
              </ToggleGroupItem>
              <ToggleGroupItem value="upcoming" size="sm" aria-label="Upcoming">
                <span>Upcoming</span>
                <Badge variant="secondary" className="ml-2">{counts.upcoming}</Badge>
              </ToggleGroupItem>
              <ToggleGroupItem value="completed" size="sm" aria-label="Completed (7d)">
                <span>Completed (7d)</span>
                <Badge variant="secondary" className="ml-2">{counts.completed}</Badge>
              </ToggleGroupItem>
            </ToggleGroup>
            <div className="ml-auto flex items-center gap-2">
              <Input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search customer or address" className="h-9 w-48" />
              <select value={sort} onChange={(e)=>setSort(e.target.value as any)} className="h-9 rounded-md border bg-background px-2 text-sm">
                <option value="when">Sort: When</option>
                <option value="customer">Sort: Customer</option>
                <option value="amount">Sort: Amount</option>
              </select>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="p-3 space-y-3">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error.message}</AlertDescription>
              </Alert>
            )}
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
                    job={j}
                    customerName={customerName}
                    when={when}
                    uninvoiced={uninvoiced}
                    onRescheduled={() => { /* Job data will refresh automatically */ }}
                    onComplete={async ()=> {
                    try {
                      const data = await edgeFetchJson(`jobs?id=${j.id}`, getToken, {
                        method: 'PATCH',
                        body: { status: 'Completed' },
                      });
                      updateJobStatus(j.id, 'Completed');
                      toast({ title: 'Marked complete' });
                      // Job data will refresh automatically
                    } catch (e: any) {
                      toast({ title: 'Failed to mark complete', description: e?.message || String(e) });
                    }
                    }}
                    onInvoice={async ()=> {
                      try {
                      const data = await edgeFetchJson(`invoices`, getToken, {
                        method: 'POST',
                        body: { jobId: j.id },
                      });
                      toast({ title: 'Invoice created' });
                      // Job data will refresh automatically
                      navigate('/invoices');
                      } catch (e: any) {
                        toast({ title: 'Failed to create invoice', description: e?.message || String(e) });
                      }
                    }}
                    onNavigate={()=> {
                      const addr = j.address || customers.find(c=>c.id===j.customerId)?.address;
                      if (addr) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank');
                    }}
                    onOpen={() => setActiveJob(j)}
                  />
                );
              })
            )}
          </CardContent>
        </Card>
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
