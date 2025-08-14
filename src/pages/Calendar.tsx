import AppLayout from '@/components/Layout/AppLayout';
import CalendarShell from '@/components/Calendar/CalendarShell';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useFocusPulse } from '@/hooks/useFocusPulse';
import { AttentionRing } from '@/components/Onboarding/AttentionRing';

export default function CalendarPage() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const job = params.get('job') || undefined;
  const { pulse: newJobPulse, focus: focusNewJob } = useFocusPulse();

  // Handle focus from onboarding navigation
  useEffect(() => {
    const state = location.state as any;
    if (state?.focus === 'new-job') {
      const timer = setTimeout(() => {
        focusNewJob();
        navigate('.', { replace: true, state: null });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [location.state, focusNewJob, navigate]);

  return (
    <AppLayout title="Calendar">
      <section className="flex-1 min-h-0 flex flex-col">
        <CalendarShell selectedJobId={job} />
      </section>
      
      {/* Focus ring for new job button */}
      {newJobPulse && (
        <AttentionRing 
          targetSelector="[data-onb='new-job-button']"
          pulse={newJobPulse}
          color="primary"
          size="md"
        />
      )}
    </AppLayout>
  );
}
