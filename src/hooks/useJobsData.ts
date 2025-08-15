import { useQuery } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";
import { queryKeys } from "@/queries/keys";
import { z } from "zod";

export interface Job {
  id: string;
  customerId: string;
  quoteId?: string | null;
  address?: string | null;
  title?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  status: "Scheduled" | "In Progress" | "Completed" | "Cancelled";
  total?: number | null;
  notes?: string | null;
  photos: string[];
  createdAt?: string;
  updatedAt?: string;
}

const JobsResponseSchema = z.object({
  rows: z.array(z.any()).optional().default([]),
  count: z.number().optional(),
});

interface UseJobsDataOptions {
  enabled?: boolean;
  loadData?: boolean;
}

/**
 * Unified jobs hook that provides both count and data
 */
export function useJobsData(opts?: UseJobsDataOptions) {
  const { businessId, isAuthenticated } = useBusinessContext();
  const enabled = isAuthenticated && (opts?.enabled ?? true);
  const loadData = opts?.loadData ?? true;

  // Count query
  const countQuery = useQuery({
    queryKey: queryKeys.counts.jobs(businessId || ''),
    enabled: enabled && !!businessId,
    queryFn: async (): Promise<number> => {
      console.info("[useJobsData] fetching count...");
      const data = await edgeRequest(`${fn('jobs')}?count=true`, {
        method: 'GET',
      });
      
      const count = data?.count ?? 0;
      console.info("[useJobsData] count:", count);
      return count;
    },
    staleTime: 30_000,
  });

  // Full data query
  const dataQuery = useQuery<Job[]>({
    queryKey: queryKeys.data.jobs(businessId || ''),
    enabled: enabled && !!businessId && loadData,
    queryFn: async () => {
      console.info("[useJobsData] fetching full data...");
      const data = await edgeRequest(fn('jobs'), {
        method: 'GET',
      });
      
      if (!data) {
        console.info("[useJobsData] no data (null) – likely signed out");
        return [];
      }
      
      const parsed = JobsResponseSchema.parse(data);
      const jobs: Job[] = (parsed.rows || []).map((row: any) => ({
        id: row.id,
        customerId: row.customerId || row.customer_id,
        quoteId: row.quoteId ?? row.quote_id ?? null,
        address: row.address ?? null,
        title: row.title ?? null,
        startsAt: row.startsAt || row.starts_at,
        endsAt: row.endsAt || row.ends_at,
        status: row.status,
        total: row.total ?? null,
        notes: row.notes ?? null,
        photos: Array.isArray(row.photos) ? row.photos : [],
        createdAt: row.createdAt || row.created_at,
        updatedAt: row.updatedAt || row.updated_at,
      }));
      
      console.info("[useJobsData] fetched", jobs.length, "jobs");
      return jobs;
    },
    staleTime: 30_000,
  });

  return {
    count: countQuery.data ?? 0,
    isLoadingCount: countQuery.isLoading,
    isErrorCount: countQuery.isError,
    errorCount: countQuery.error,
    
    data: dataQuery.data ?? [],
    isLoadingData: dataQuery.isLoading,
    isErrorData: dataQuery.isError,
    errorData: dataQuery.error,
    
    isLoading: countQuery.isLoading || (loadData && dataQuery.isLoading),
    isError: countQuery.isError || (loadData && dataQuery.isError),
    error: countQuery.error || (loadData && dataQuery.error),
    
    refetchCount: countQuery.refetch,
    refetchData: dataQuery.refetch,
    refetch: () => {
      countQuery.refetch();
      if (loadData) dataQuery.refetch();
    },
  };
}