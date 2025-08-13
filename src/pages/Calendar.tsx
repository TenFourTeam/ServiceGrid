import AppLayout from '@/components/Layout/AppLayout';
import CalendarShell from '@/components/Calendar/CalendarShell';
import { useSearchParams } from 'react-router-dom';
import { useSupabaseJobs } from '@/hooks/useSupabaseJobs';
import { Button } from '@/components/ui/button';

export default function CalendarPage() {
  const [params] = useSearchParams();
  const job = params.get('job') || undefined;
  const { data: jobsData } = useSupabaseJobs();
  const hasJobs = (jobsData?.rows?.length ?? 0) > 0;

  return (
    <AppLayout title="Calendar">
      <section className="flex-1 min-h-0 flex flex-col">
        {!hasJobs ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-6xl">🗓</div>
              <h2 className="text-2xl font-semibold">Ready to schedule your first job?</h2>
              <p className="text-muted-foreground">
                Pick a time slot above or click "New Job" to get started.
              </p>
              <div className="flex gap-2 justify-center">
                <Button>New Job</Button>
                <Button variant="outline">New Quote</Button>
              </div>
            </div>
          </div>
        ) : (
          <CalendarShell selectedJobId={job} />
        )}
      </section>
    </AppLayout>
  );
}
