import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { queryKeys } from "@/queries/keys";
import { useBusinessContext } from "@/hooks/useBusinessContext";

import type { Job } from '@/types';

interface UseJobsDataOptions {
  enabled?: boolean;
}

/**
 * Edge Function jobs hook - unified Clerk authentication
 */
export function useJobsData(opts?: UseJobsDataOptions) {
  const { isAuthenticated, businessId } = useBusinessContext();
  const enabled = isAuthenticated && !!businessId && (opts?.enabled ?? true);

  const query = useQuery({
    queryKey: queryKeys.data.jobs(businessId || ''),
    enabled,
    queryFn: async () => {
      console.info("[useJobsData] fetching jobs via edge function");
      
      const { data, error } = await supabase.functions.invoke('jobs-crud', {
        method: 'GET'
      });
      
      if (error) {
        console.error("[useJobsData] error:", error);
        throw new Error(error.message || 'Failed to fetch jobs');
      }
      
      console.info("[useJobsData] fetched", data?.jobs?.length || 0, "jobs");
      
      return { jobs: data?.jobs || [], count: data?.count || 0 };
    },
    staleTime: 30_000,
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