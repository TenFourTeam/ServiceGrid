import AppLayout from '@/components/Layout/AppLayout';
import CalendarShell from '@/components/Calendar/CalendarShell';
import { useSearchParams } from 'react-router-dom';
import { useSupabaseJobs } from '@/hooks/useSupabaseJobs';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/components/Onboarding/OnboardingProvider';

export default function CalendarPage() {
  const [params] = useSearchParams();
  const job = params.get('job') || undefined;
  const { data: jobsData } = useSupabaseJobs();
  const hasJobs = (jobsData?.rows?.length ?? 0) > 0;
  const onboarding = useOnboarding();

  return (
    <AppLayout title="Calendar">
      <section className="flex-1 min-h-0 flex flex-col">
        <CalendarShell selectedJobId={job} />
      </section>
    </AppLayout>
  );
}
