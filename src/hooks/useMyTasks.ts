import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface MyTask {
  itemId: string;
  itemTitle: string;
  itemDescription: string | null;
  requiredPhotoCount: number;
  currentPhotoCount: number;
  checklistId: string;
  checklistTitle: string;
  jobId: string;
  jobTitle: string;
  jobStartsAt: string | null;
  jobAddress: string | null;
}

interface MyTasksResponse {
  tasks: MyTask[];
  currentTimesheet: {
    id: string;
    jobId: string | null;
    clockInTime: string;
  } | null;
}

/**
 * Hook to fetch tasks assigned to the current user
 */
export function useMyTasks() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  
  const query = useQuery<MyTasksResponse>({
    queryKey: ['my-checklist-tasks'],
    queryFn: async () => {
      const { data, error } = await authApi.invoke('my-checklist-tasks', {
        method: 'GET',
      });
      
      if (error) throw new Error(error.message || 'Failed to fetch tasks');
      return data;
    },
  });

  // Real-time subscription for task updates
  useEffect(() => {
    const channel = supabase
      .channel('my-tasks-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all changes (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'sg_checklist_items',
        },
        () => {
          console.log('[useMyTasks] Checklist item changed, invalidating query');
          queryClient.invalidateQueries({ queryKey: ['my-checklist-tasks'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
