import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuthApi } from "@/hooks/useAuthApi";
import { queryKeys } from "@/queries/keys";
import type { JobsCacheData, BusinessMember } from "@/types";

export interface JobAssignmentRequest {
  jobId: string;
  userIds: string[];
  syncChecklists?: boolean;
}

/**
 * Hook for managing job assignments - assigning/unassigning team members to jobs
 */
export function useJobAssignments() {
  const queryClient = useQueryClient();
  const { businessId, userId } = useBusinessContext();
  const authApi = useAuthApi();

  const assignMembers = useMutation({
    mutationFn: async ({ jobId, userIds, syncChecklists = true }: JobAssignmentRequest) => {
      const { data, error } = await authApi.invoke('jobs-crud-assign', {
        method: "POST",
        body: { jobId, userIds, syncChecklists },
        toast: {
          success: "Team members assigned successfully",
          loading: "Assigning team members...",
          error: "Failed to assign team members"
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to assign team members');
      }
      
      return data;
    },
    onMutate: async ({ jobId, userIds }) => {
      const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<JobsCacheData>(queryKey);
      
      queryClient.setQueryData<JobsCacheData>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          jobs: old.jobs.map((job) => {
            if (job.id === jobId) {
              const existingMembers = job.assignedMembers || [];
              const newMembers: BusinessMember[] = userIds.map(user_id => ({ user_id } as BusinessMember));
              return {
                ...job,
                assignedMembers: [...existingMembers, ...newMembers]
              };
            }
            return job;
          })
        };
      });
      
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data', 'jobs', businessId] });
    },
    onError: (error: Error | unknown, _variables, context) => {
      console.error('[useJobAssignments.assignMembers] error:', error);
      if (context?.previousData) {
        const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
  });

  const unassignMembers = useMutation({
    mutationFn: async ({ jobId, userIds, syncChecklists = true }: JobAssignmentRequest) => {
      const { data, error } = await authApi.invoke('jobs-crud-assign', {
        method: "DELETE",
        body: { jobId, userIds, syncChecklists },
        toast: {
          success: "Team members unassigned successfully",
          loading: "Unassigning team members...",
          error: "Failed to unassign team members"
        }
      });
      
      if (error) {
        throw new Error(error.message || 'Failed to unassign team members');
      }
      
      return data;
    },
    onMutate: async ({ jobId, userIds }) => {
      const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
      await queryClient.cancelQueries({ queryKey });
      
      const previousData = queryClient.getQueryData<JobsCacheData>(queryKey);
      
      queryClient.setQueryData<JobsCacheData>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          jobs: old.jobs.map((job) => {
            if (job.id === jobId) {
              const existingMembers = job.assignedMembers || [];
              return {
                ...job,
                assignedMembers: existingMembers.filter(m => !userIds.includes(m.user_id))
              };
            }
            return job;
          })
        };
      });
      
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['data', 'jobs', businessId] });
    },
    onError: (error: Error | unknown, _variables, context) => {
      console.error('[useJobAssignments.unassignMembers] error:', error);
      if (context?.previousData) {
        const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
  });

  return {
    assignMembers,
    unassignMembers,
  };
}