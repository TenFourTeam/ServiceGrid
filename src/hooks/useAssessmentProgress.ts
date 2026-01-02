import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';

export interface AssessmentProgress {
  checklistProgress: number;
  totalChecklistItems: number;
  completedChecklistItems: number;
  photoCount: number;
  beforePhotoCount: number;
  risksFound: number;
  opportunitiesFound: number;
  hasReport: boolean;
}

export function useAssessmentProgress(jobId: string | undefined) {
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['assessment-progress', jobId],
    queryFn: async (): Promise<AssessmentProgress> => {
      const defaultProgress = {
        checklistProgress: 0, totalChecklistItems: 0, completedChecklistItems: 0,
        photoCount: 0, beforePhotoCount: 0, risksFound: 0, opportunitiesFound: 0, hasReport: false,
      };
      if (!jobId) return defaultProgress;

      const { data, error } = await authApi.invoke('assessment-progress', {
        method: 'GET',
        queryParams: { jobId },
      });

      if (error) return defaultProgress;
      return data as AssessmentProgress;
    },
    enabled: !!jobId,
    staleTime: 30000,
  });
}

export function useRequestAssessmentJob(requestId: string | undefined) {
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['request-assessment-job', requestId],
    queryFn: async () => {
      if (!requestId) return null;

      const { data, error } = await authApi.invoke('assessment-progress', {
        method: 'GET',
        queryParams: { requestId, action: 'request-job' },
      });

      if (error) return null;
      return data;
    },
    enabled: !!requestId,
    staleTime: 30000,
  });
}
