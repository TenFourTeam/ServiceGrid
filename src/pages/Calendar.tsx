import AppLayout from '@/components/Layout/AppLayout';
import CalendarShell from '@/components/Calendar/CalendarShell';
import { useSearchParams } from 'react-router-dom';

export default function CalendarPage() {
  const [params] = useSearchParams();
  const job = params.get('job') || undefined;
  return (
    <AppLayout title="Calendar">
      <section>
        <CalendarShell selectedJobId={job} />
      </section>
    </AppLayout>
  );
}
