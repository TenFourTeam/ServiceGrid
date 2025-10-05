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
 * @param businessId - Explicit businessId to fetch jobs for (bypasses context)
 * @param opts - Additional options like enabled flag
 */
export function useJobsData(businessId?: string, opts?: UseJobsDataOptions) {
  const context = useBusinessContext();
  const authApi = useAuthApi();
  
  // Use provided businessId or fall back to context
  const effectiveBusinessId = businessId || context.businessId;
  const userId = context.userId;
  const role = context.role;
  const isAuthenticated = context.isAuthenticated;
  
  const enabled = isAuthenticated && !!effectiveBusinessId && (opts?.enabled ?? true);
  const queryClient = useQueryClient();

  const queryKey = queryKeys.data.jobs(effectiveBusinessId || '', userId || '');
  console.log("[useJobsData] DEBUG - Query setup:", {
    queryKey,
    effectiveBusinessId,
    userId,
    role,
    enabled,
    isAuthenticated
  });

  const query = useQuery({
    queryKey,
    enabled,
    staleTime: 30000, // 30 seconds - allow optimistic updates to settle
    refetchOnMount: true, // Refetch on mount but not aggressively
    queryFn: async () => {
      console.log("[useJobsData] DEBUG - Starting fetch with context:", {
        effectiveBusinessId,
        userId,
        role,
        timestamp: new Date().toISOString()
      });
      
      const { data, error } = await authApi.invoke('jobs-crud', {
        method: 'GET',
        headers: {
          'x-business-id': effectiveBusinessId
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

  // Force refetch when business changes
  useEffect(() => {
    if (effectiveBusinessId && isAuthenticated && enabled) {
      console.log("[useJobsData] Business ID changed, refetching jobs for:", effectiveBusinessId);
      query.refetch();
    }
  }, [effectiveBusinessId]);

  // Realtime subscription for instant updates
  useEffect(() => {
    if (!isAuthenticated || !effectiveBusinessId) return;

    console.log("[useJobsData] Setting up realtime subscription for businessId:", effectiveBusinessId);
    
    const channel = supabase
      .channel('jobs-realtime')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'jobs' 
      }, (payload) => {
        console.log("[useJobsData] Realtime jobs change:", payload);
        // Delay invalidation to allow optimistic updates to settle
        setTimeout(() => {
          invalidationHelpers.jobs(queryClient, effectiveBusinessId);
        }, 200);
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'job_assignments' 
      }, (payload) => {
        console.log("[useJobsData] Realtime job_assignments change:", payload);
        // Delay invalidation to allow optimistic updates to settle
        setTimeout(() => {
          invalidationHelpers.jobs(queryClient, effectiveBusinessId);
        }, 200);
      })
      .subscribe();

    return () => {
      console.log("[useJobsData] Cleaning up realtime subscription");
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, effectiveBusinessId, queryClient]);

  return {
    data: query.data?.jobs ?? [],
    count: query.data?.count ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}