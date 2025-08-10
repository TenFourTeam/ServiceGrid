import { useMemo, useState, useEffect } from 'react';
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

function useFilteredJobs() {
  const { jobs, customers, invoices } = useStore();
  const [filter, setFilter] = useState<'unscheduled' | 'today' | 'upcoming' | 'completed'>('today');
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

function WorkOrderRow({ job, onSchedule, onComplete, onInvoice, onViewInvoice, onNavigate, uninvoiced, customerName, when }: {
  job: Job;
  onSchedule: () => void;
  onComplete: () => void;
  onInvoice: () => void;
  onViewInvoice?: () => void;
  onNavigate: () => void;
  uninvoiced: boolean;
  customerName: string;
  when: string;
}) {
  return (
    <div className="p-3 border rounded-md bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-medium truncate">{customerName}</div>
            <div className="text-sm text-muted-foreground">{formatMoney(job.total || 0)}</div>
            {uninvoiced && job.status==='Completed' && <Badge variant="secondary">Uninvoiced</Badge>}
          </div>
          <div className="text-xs text-muted-foreground truncate">{job.address}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-xs text-muted-foreground text-right">
            <div>{when}</div>
            <div className="mt-1"><StatusChip status={job.status} /></div>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={onSchedule}>Schedule</Button>
        <Button size="sm" onClick={onComplete}>Complete</Button>
        {job.status==='Completed' && uninvoiced && <Button size="sm" onClick={onInvoice}>Invoice</Button>}
        <Button size="sm" variant="outline" onClick={onNavigate}>Navigate</Button>
      </div>
    </div>
  );
}

export default function WorkOrdersPage() {
  const { customers, updateJobStatus, createInvoiceFromJob, upsertJob } = useStore();
  const { isSignedIn } = useClerkAuth();
  const { data: dbJobs } = useSupabaseJobs({ enabled: !!isSignedIn });
  const { filter, setFilter, q, setQ, sort, setSort, jobs, counts, hasInvoice } = useFilteredJobs();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSignedIn || !dbJobs?.rows) return;
    dbJobs.rows.forEach((row) => {
      upsertJob({
        id: row.id,
        customerId: row.customerId,
        quoteId: row.quoteId || undefined,
        address: row.address || undefined,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        status: row.status,
        total: row.total || undefined,
        createdAt: row.createdAt,
      });
    });
  }, [isSignedIn, dbJobs, upsertJob]);

  return (
    <AppLayout title="Work Orders">
      <section aria-label="work-orders" className="space-y-3">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b py-2">
          <div className="flex items-center gap-2 overflow-x-auto">
            {([
              { key: 'unscheduled', label: `Unscheduled (${counts.unscheduled})` },
              { key: 'today', label: `Today (${counts.today})` },
              { key: 'upcoming', label: `Upcoming (${counts.upcoming})` },
              { key: 'completed', label: `Completed (7d) (${counts.completed})` },
            ] as const).map((c) => (
              <Button key={c.key} variant={filter===c.key? 'default' : 'secondary'} size="sm" onClick={()=>setFilter(c.key as any)}>
                {c.label}
              </Button>
            ))}
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
            {jobs.length === 0 ? (
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
                    onSchedule={()=> { navigate(`/calendar?job=${j.id}`); toast({ title: 'Scheduling', description: 'Pick a time in Calendar' }); }}
                    onComplete={()=> { updateJobStatus(j.id, 'Completed'); toast({ title: 'Marked complete' }); }}
                    onInvoice={()=> { const inv = createInvoiceFromJob(j.id); toast({ title: 'Invoice created', description: `${inv.number} ready to send` }); navigate('/invoices'); }}
                    onNavigate={()=> {
                      const addr = j.address || customers.find(c=>c.id===j.customerId)?.address;
                      if (addr) window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`, '_blank');
                    }}
                  />
                );
              })
            )}
          </CardContent>
        </Card>
      </section>
    </AppLayout>
  );
}
