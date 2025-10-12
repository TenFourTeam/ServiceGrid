import AppLayout from '@/components/Layout/AppLayout';
import CalendarShell from '@/components/Calendar/CalendarShell';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { ErrorBoundary } from 'react-error-boundary';
import { Button } from '@/components/ui/button';

function CalendarErrorFallback({ error, resetErrorBoundary }: any) {
  console.error('[Calendar] Error:', error);
  return (
    <div className="flex-1 grid place-items-center p-4">
      <div className="text-center max-w-md">
        <h2 className="text-lg font-semibold mb-2">Unable to load calendar</h2>
        <p className="text-sm text-muted-foreground mb-4">
          {error.message || 'An unexpected error occurred'}
        </p>
        <Button onClick={resetErrorBoundary}>Reload Calendar</Button>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const [params] = useSearchParams();
  const job = params.get('job') || undefined;
  const businessId = params.get('businessId') || undefined;
  const { t } = useLanguage();

  return (
    <AppLayout title={t('navigation.calendar')} businessId={businessId}>
      <ErrorBoundary FallbackComponent={CalendarErrorFallback}>
        <section className="flex-1 min-h-0 flex flex-col">
          <CalendarShell 
            key={businessId} // Force re-render when business changes
            selectedJobId={job} 
            businessId={businessId} 
          />
        </section>
      </ErrorBoundary>
    </AppLayout>
  );
}
