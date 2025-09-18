import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from "@/utils/authEdgeApi";

import type { Job } from '@/types';

interface UseJobsDataOptions {
  enabled?: boolean;
}

/**
 * Edge Function jobs hook - unified Clerk authentication
 */
export function useJobsData(opts?: UseJobsDataOptions) {
  const { isAuthenticated, businessId, userId, role } = useBusinessContext();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(() => getToken({ template: 'supabase' }));
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const queryKey = queryKeys.data.jobs(businessId || '', userId || '');
  console.log("[useJobsData] DEBUG - Query setup:", {
    queryKey,
    businessId,
    userId,
    role,
    enabled,
    isAuthenticated
  });

  const query = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      console.log("[useJobsData] DEBUG - Starting fetch with context:", {
        businessId,
        userId,
        role,
        timestamp: new Date().toISOString()
      });
      
      const { data, error } = await authApi.invoke('jobs-crud', {
        method: 'GET'
      });
      
      if (error) {
        console.error("[useJobsData] ERROR:", error);
        throw new Error(error.message || 'Failed to fetch jobs');
      }
      
      console.log("[useJobsData] DEBUG - Raw response:", {
        jobsCount: data?.jobs?.length || 0,
        totalCount: data?.count || 0,
        jobs: data?.jobs?.map((job: any) => ({
          id: job.id,
          title: job.title,
          scheduledStart: job.scheduled_start,
          scheduledEnd: job.scheduled_end
        })) || [],
        fullResponse: data
      });
      
      return { jobs: data?.jobs || [], count: data?.count || 0 };
    },
    refetchOnWindowFocus: true, // Get fresh data when user returns to tab
  });

  return {
    data: query.data?.jobs ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}