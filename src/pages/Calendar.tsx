import AppLayout from '@/components/Layout/AppLayout';
import { WeekCalendar } from '@/components/Calendar/WeekCalendar';

export default function CalendarPage() {
  return (
    <AppLayout title="Calendar">
      <section>
        <WeekCalendar />
      </section>
    </AppLayout>
  );
}
