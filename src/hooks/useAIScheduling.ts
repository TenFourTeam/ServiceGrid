import { useMutation } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { Job, BusinessMember } from '@/types';

export interface ScheduleSuggestion {
  jobId: string;
  recommendedStartTime: string;
  recommendedEndTime: string;
  assignedMemberId?: string;
  priorityScore: number;
  reasoning: string;
}

/**
 * Hook to get AI-powered scheduling suggestions
 * Analyzes unscheduled jobs, existing schedule, and team availability
 * to provide optimal time slot recommendations
 */
export function useAIScheduling() {
  const authApi = useAuthApi();

  return useMutation({
    mutationFn: async ({
      businessId,
      unscheduledJobs,
      existingJobs,
      teamMembers
    }: {
      businessId: string;
      unscheduledJobs: Partial<Job>[];
      existingJobs: Job[];
      teamMembers: BusinessMember[];
    }) => {
      console.info('[useAIScheduling] Requesting AI suggestions', { 
        businessId, 
        unscheduledCount: unscheduledJobs.length,
        existingCount: existingJobs.length 
      });

      const { data, error } = await authApi.invoke('ai-schedule-optimizer', {
        method: 'POST',
        body: {
          businessId,
          unscheduledJobs,
          existingJobs,
          teamMembers
        }
      });

      if (error) {
        console.error('[useAIScheduling] Error:', error);
        throw new Error(error.message || 'Failed to get AI scheduling suggestions');
      }

      console.info('[useAIScheduling] Suggestions received', { count: data.suggestions?.length });
      return data.suggestions as ScheduleSuggestion[];
    }
  });
}
