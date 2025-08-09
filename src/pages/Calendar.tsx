import AppLayout from '@/components/Layout/AppLayout';
import { WeekCalendar } from '@/components/Calendar/WeekCalendar';
import { useSearchParams, Link } from 'react-router-dom';
import { useStore } from '@/store/useAppStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NewJobSheet } from '@/components/Job/NewJobSheet';

export default function CalendarPage() {
  const [params] = useSearchParams();
  const job = params.get('job') || undefined;
  const store = useStore();
  const isEmpty = store.jobs.length === 0;
  return (
    <AppLayout title="Calendar">
      <section className="space-y-4">
        {isEmpty && (
          <Card>
            <CardHeader><CardTitle>Schedule your first job</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">You have no jobs yet. Create a customer and a quote, or schedule directly.</p>
              <div className="flex gap-2">
                <NewJobSheet />
                <Link className="underline text-sm self-center" to="/estimates?new=1">Create quote</Link>
              </div>
            </CardContent>
          </Card>
        )}
        <WeekCalendar selectedJobId={job} />
      </section>
    </AppLayout>
  );
}
