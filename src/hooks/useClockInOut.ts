import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/queries/keys";
import { toast } from "sonner";
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from "@/utils/authEdgeApi";
import { Job } from "@/types";

export function useClockInOut() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));

  const clockInOut = useMutation({
    mutationFn: async ({ jobId, isClockingIn }: { jobId: string; isClockingIn: boolean }) => {
      const updateData = isClockingIn
        ? {
            clock_in_time: new Date().toISOString(),
            is_clocked_in: true,
            status: 'In Progress' as const
          }
        : {
            clock_out_time: new Date().toISOString(),
            is_clocked_in: false,
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
    onSuccess: (data, variables) => {
      const { isClockingIn } = variables;
      
      // Invalidate jobs queries to refresh the data
      queryClient.invalidateQueries({ queryKey: queryKeys.data.jobs('') });
      
      toast.success(isClockingIn ? "Clocked In - Time tracking started" : "Clocked Out - Time tracking stopped");
    },
    onError: (error) => {
      toast.error("Failed to update clock status");
      console.error("Clock in/out error:", error);
    },
  });

  return {
    clockInOut: clockInOut.mutate,
    isLoading: clockInOut.isPending,
  };
}