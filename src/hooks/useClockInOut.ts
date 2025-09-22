import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/queries/keys";
import { toast } from "sonner";
import { useAuthApi } from "@/hooks/useAuthApi";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { Job } from "@/types";

export function useClockInOut() {
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();

  const clockInOut = useMutation({
    mutationFn: async ({ jobId, isClockingIn }: { jobId: string; isClockingIn: boolean }) => {
      const updateData = isClockingIn
        ? {
            clockInTime: new Date().toISOString(),
            isClockedIn: true,
            status: 'In Progress' as const
          }
        : {
            clockOutTime: new Date().toISOString(),
            isClockedIn: false,
            status: 'Completed' as const
          };

      const { data, error } = await authApi.invoke('jobs-crud', {
        method: 'PUT',
        body: {
          id: jobId,
          ...updateData
        }
      });

      if (error) throw error;
      return data;
    },
    onMutate: async ({ jobId, isClockingIn }) => {
      // Use the correct query key with businessId
      const queryKey = queryKeys.data.jobs(businessId || '');
      
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousJobs = queryClient.getQueryData(queryKey);

      // Optimistically update the job
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.jobs) return old;
        
        const currentTime = new Date().toISOString();
        return {
          ...old,
          jobs: old.jobs.map((job: Job) => 
            job.id === jobId 
              ? {
                  ...job,
                  isClockedIn: isClockingIn,
                  clockInTime: isClockingIn ? currentTime : job.clockInTime,
                  clockOutTime: !isClockingIn ? currentTime : job.clockOutTime,
                  status: isClockingIn ? 'In Progress' : 'Completed'
                }
              : job
          )
        };
      });

      return { previousJobs, queryKey };
    },
    onSuccess: (data, variables) => {
      const { isClockingIn } = variables;
      
      // Don't invalidate immediately - let optimistic update persist
      // The data should already be up to date from the optimistic update
      
      toast.success(isClockingIn ? "Job Started - Time tracking started" : "Job Stopped - Time tracking stopped");
    },
    onError: (error, variables, context) => {
      // Roll back to the previous state
      if (context?.previousJobs && context?.queryKey) {
        queryClient.setQueryData(context.queryKey, context.previousJobs);
      }
      
      toast.error("Failed to update clock status");
      console.error("Clock in/out error:", error);
    },
  });

  return {
    clockInOut: clockInOut.mutate,
    isLoading: clockInOut.isPending,
  };
}