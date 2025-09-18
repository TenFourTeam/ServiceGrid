import AppLayout from '@/components/Layout/AppLayout';
import CalendarShell from '@/components/Calendar/CalendarShell';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CalendarPage() {
  const [params] = useSearchParams();
  const job = params.get('job') || undefined;
  const { t } = useLanguage();

  return (
    <AppLayout title={t('navigation.calendar')}>
      <section className="flex-1 min-h-0 flex flex-col">
        <CalendarShell selectedJobId={job} />
      </section>
      
    </AppLayout>
  );
}
