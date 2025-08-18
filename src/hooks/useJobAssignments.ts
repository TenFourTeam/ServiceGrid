import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from "@/utils/authEdgeApi";
import { queryKeys } from "@/queries/keys";

export interface JobAssignmentRequest {
  jobId: string;
  userIds: string[];
}

/**
 * Hook for managing job assignments - assigning/unassigning team members to jobs
 */
export function useJobAssignments() {
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));

  const assignMembers = useMutation({
    mutationFn: async ({ jobId, userIds }: JobAssignmentRequest) => {
      const { data, error } = await authApi.invoke('jobs-crud-assign', {
        method: "POST",
        body: { jobId, userIds },
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
    onSuccess: () => {
      // Invalidate jobs data to refresh the assignments
      queryClient.invalidateQueries({ queryKey: queryKeys.data.jobs(businessId || '') });
    },
    onError: (error: any) => {
      console.error('[useJobAssignments.assignMembers] error:', error);
    },
  });

  const unassignMembers = useMutation({
    mutationFn: async ({ jobId, userIds }: JobAssignmentRequest) => {
      const { data, error } = await authApi.invoke('jobs-crud-assign', {
        method: "DELETE",
        body: { jobId, userIds },
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
    onSuccess: () => {
      // Invalidate jobs data to refresh the assignments
      queryClient.invalidateQueries({ queryKey: queryKeys.data.jobs(businessId || '') });
    },
    onError: (error: any) => {
      console.error('[useJobAssignments.unassignMembers] error:', error);
    },
  });

  return {
    assignMembers,
    unassignMembers,
  };
}