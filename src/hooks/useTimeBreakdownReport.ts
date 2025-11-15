import { useQuery } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { format } from 'date-fns';

export interface TimeBreakdownFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  jobId?: string;
  groupBy: 'daily' | 'weekly';
}

export interface DailyTimeEntry {
  business_id: string;
  user_id: string;
  user_name: string;
  work_date: string;
  job_id: string | null;
  job_title: string | null;
  job_address: string | null;
  timesheet_minutes: number;
  tasks_completed: number;
  task_minutes: number;
  task_categories: string[] | null;
}

export interface WeeklyTimeEntry {
  business_id: string;
  user_id: string;
  user_name: string;
  week_start: string;
  job_id: string | null;
  job_title: string | null;
  total_timesheet_minutes: number;
  total_tasks_completed: number;
  total_task_minutes: number;
  all_task_categories: string[] | null;
}

export interface CategoryBreakdown {
  category: string;
  user_id: string;
  user_name: string;
  completion_date: string;
  task_count: number;
  total_minutes: number;
  avg_minutes_per_task: number;
  tasks: Array<{
    task_title: string;
    job_title: string;
    minutes: number;
    completed_at: string;
  }>;
}

export interface TimeBreakdownReport {
  timeBreakdown: DailyTimeEntry[] | WeeklyTimeEntry[];
  categoryBreakdown: CategoryBreakdown[];
  summary: {
    totalTimeMinutes: number;
    totalTaskMinutes: number;
    totalTasksCompleted: number;
    uniqueUsers: number;
    uniqueJobs: number;
    dateRange: {
      start?: string;
      end?: string;
    };
  };
  filters: TimeBreakdownFilters;
}

export function useTimeBreakdownReport(filters: TimeBreakdownFilters) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery<TimeBreakdownReport>({
    queryKey: ['time-breakdown-report', businessId, filters],
    queryFn: async () => {
      if (!businessId) throw new Error('No business selected');

      const params = new URLSearchParams({
        groupBy: filters.groupBy,
      });

      if (filters.startDate) {
        params.append('startDate', format(filters.startDate, 'yyyy-MM-dd'));
      }
      if (filters.endDate) {
        params.append('endDate', format(filters.endDate, 'yyyy-MM-dd'));
      }
      if (filters.userId) {
        params.append('userId', filters.userId);
      }
      if (filters.jobId) {
        params.append('jobId', filters.jobId);
      }

      const { data, error } = await authApi.invoke('time-breakdown-report', {
        method: 'GET',
        queryParams: Object.fromEntries(params),
        headers: {
          'x-business-id': businessId,
        },
      });

      if (error) throw new Error(error.message || 'Failed to fetch report');
      return data;
    },
    enabled: !!businessId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
