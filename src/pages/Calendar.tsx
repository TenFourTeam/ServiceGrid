import AppLayout from '@/components/Layout/AppLayout';
import { WeekCalendar } from '@/components/Calendar/WeekCalendar';
import { useSearchParams } from 'react-router-dom';

export default function CalendarPage() {
  const [params] = useSearchParams();
  const job = params.get('job') || undefined;
  return (
    <AppLayout title="Calendar">
      <section>
        <WeekCalendar selectedJobId={job} />
      </section>
    </AppLayout>
  );
}
