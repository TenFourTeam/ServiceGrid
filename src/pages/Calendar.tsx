import AppLayout from '@/components/Layout/AppLayout';
import CalendarShell from '@/components/Calendar/CalendarShell';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CalendarPage() {
  const [params] = useSearchParams();
  const job = params.get('job') || undefined;
  const businessId = params.get('businessId') || undefined;
  const { t } = useLanguage();

  return (
    <AppLayout title={t('navigation.calendar')} businessId={businessId}>
      <section className="flex-1 min-h-0 flex flex-col">
        <CalendarShell 
          key={businessId} // Force re-render when business changes
          selectedJobId={job} 
          businessId={businessId} 
        />
      </section>
      
    </AppLayout>
  );
}
