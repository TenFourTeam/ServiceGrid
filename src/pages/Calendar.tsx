import { useEffect } from 'react';
import AppLayout from '@/components/Layout/AppLayout';
import CalendarShell from '@/components/Calendar/CalendarShell';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';

export default function CalendarPage() {
  const [params] = useSearchParams();
  const job = params.get('job') || undefined;
  const businessId = params.get('businessId') || undefined;
  const date = params.get('date') || undefined;
  const highlight = params.get('highlight') || undefined;
  const { t } = useLanguage();

  // Log for debugging - CalendarShell will need to handle these params
  useEffect(() => {
    if (date) {
      console.log('Calendar: Navigate to date:', date);
    }
    if (highlight) {
      console.log('Calendar: Highlight job:', highlight);
    }
  }, [date, highlight]);

  return (
    <AppLayout title={t('navigation.calendar')} businessId={businessId}>
      <section className="flex-1 min-h-0 flex flex-col">
        <CalendarShell 
          key={`${businessId}-${date}-${highlight}`} // Force re-render when params change
          selectedJobId={job || highlight} 
          businessId={businessId}
        />
      </section>
      
    </AppLayout>
  );
}
