import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface CompletedTaskMedia {
  id: string;
  file_type: 'photo' | 'video';
  public_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

export interface CompletedTask {
  itemId: string;
  itemTitle: string;
  itemDescription: string | null;
  requiredPhotoCount: number;
  completedAt: string;
  completedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  checklistId: string;
  checklistTitle: string;
  jobId: string;
  jobTitle: string;
  jobAddress: string | null;
  jobStartsAt: string | null;
  media: CompletedTaskMedia[];
  timeSpentMinutes?: number | null;
  timesheetEntryId?: string | null;
}

export interface CompletedTasksResponse {
  completedTasks: CompletedTask[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  stats: {
    totalCompleted: number;
    completedInRange: number;
    totalPhotos: number;
  };
}

export function useMyCompletedTasks(
  dateRange: number | 'all' = 30,
  jobId?: string,
  limit: number = 50,
  offset: number = 0
) {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  
  const query = useQuery<CompletedTasksResponse>({
    queryKey: ['my-completed-tasks', dateRange, jobId, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams({
        dateRange: dateRange.toString(),
        limit: limit.toString(),
        offset: offset.toString(),
      });
      
      if (jobId) {
        params.append('jobId', jobId);
      }
      
      const { data, error } = await authApi.invoke(
        `my-completed-tasks?${params.toString()}`,
        { method: 'GET' }
      );
      
      if (error) throw new Error(error.message || 'Failed to fetch completed tasks');
      return data;
    },
  });

  // Real-time subscription for task completions
  useEffect(() => {
    const channel = supabase
      .channel('my-completed-tasks-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sg_checklist_items',
        },
        (payload) => {
          const newItem = payload.new as any;
          // Only invalidate if it's a completion event
          if (newItem.is_completed) {
            console.log('[useMyCompletedTasks] Task completed, invalidating query');
            queryClient.invalidateQueries({ queryKey: ['my-completed-tasks'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
