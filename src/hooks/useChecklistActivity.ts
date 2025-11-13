import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface ChecklistActivityEvent {
  id: string;
  event_type: 'created' | 'item_completed' | 'item_uncompleted' | 'photo_required_failed' | 'checklist_assigned' | 'item_assigned';
  created_at: string;
  metadata?: any;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  item: {
    id: string;
    title: string;
  } | null;
}

export function useChecklistActivity(checklistId: string | undefined) {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['checklist-activity', checklistId],
    queryFn: async () => {
      if (!checklistId) return null;

      const { data, error } = await authApi.invoke(
        `checklist-activity?checklistId=${checklistId}`,
        { method: 'GET' }
      );

      if (error) throw error;
      return data?.events as ChecklistActivityEvent[] || [];
    },
    enabled: !!checklistId,
  });

  // Real-time subscription for activity updates
  useEffect(() => {
    if (!checklistId) return;

    const channel = supabase
      .channel(`checklist-activity:${checklistId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sg_checklist_events',
          filter: `checklist_id=eq.${checklistId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['checklist-activity', checklistId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checklistId, queryClient]);

  return query;
}
