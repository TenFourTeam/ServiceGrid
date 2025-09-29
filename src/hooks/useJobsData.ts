import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys, invalidationHelpers } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuthApi } from "@/hooks/useAuthApi";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from 'react';

import type { Job } from '@/types';

interface UseJobsDataOptions {
  enabled?: boolean;
}

/**
 * Edge Function jobs hook - unified Clerk authentication
 */
export function useJobsData(opts?: UseJobsDataOptions) {
  const { isAuthenticated, businessId, userId, role } = useBusinessContext();
  const authApi = useAuthApi();
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);
  const queryClient = useQueryClient();

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
        method: 'GET',
        headers: {
          'x-business-id': businessId
        }
      });
      
      if (error) {
        console.error("[useJobsData] ERROR:", error);
        throw new Error(error.message || 'Failed to fetch jobs');
      }
      
      console.log("[useJobsData] DEBUG - Raw response:", {
        jobsCount: data?.jobs?.length || 0,
        totalCount: data?.count || 0,
        jobs: data?.jobs?.map((job: Record<string, unknown>) => ({
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

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!isAuthenticated || !businessId) return;

    console.log("[useJobsData] Setting up realtime subscription for businessId:", businessId);
    
    const channel = supabase
      .channel('jobs-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'jobs' 
      }, (payload) => {
        console.log("[useJobsData] Realtime jobs change:", payload);
        invalidationHelpers.jobs(queryClient, businessId);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'job_assignments' 
      }, (payload) => {
        console.log("[useJobsData] Realtime job_assignments change:", payload);
        invalidationHelpers.jobs(queryClient, businessId);
      })
      .subscribe();

    return () => {
      console.log("[useJobsData] Cleaning up realtime subscription");
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, businessId, queryClient]);

  return {
    data: query.data?.jobs ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}