import { useNavigate } from 'react-router-dom';

export function useCalendarNavigation() {
  const navigate = useNavigate();

  const navigateToDate = (dateStr: string, businessId?: string) => {
    const params = new URLSearchParams();
    params.set('date', dateStr);
    if (businessId) {
      params.set('businessId', businessId);
    }
    navigate(`/calendar?${params.toString()}`);
  };

  const navigateToJob = (jobId: string, businessId?: string) => {
    const params = new URLSearchParams();
    params.set('job', jobId);
    if (businessId) {
      params.set('businessId', businessId);
    }
    navigate(`/calendar?${params.toString()}`);
  };

  const navigateToDateWithHighlight = (dateStr: string, jobId: string, businessId?: string) => {
    const params = new URLSearchParams();
    params.set('date', dateStr);
    params.set('highlight', jobId);
    if (businessId) {
      params.set('businessId', businessId);
    }
    navigate(`/calendar?${params.toString()}`);
  };

  return { navigateToDate, navigateToJob, navigateToDateWithHighlight };
}
