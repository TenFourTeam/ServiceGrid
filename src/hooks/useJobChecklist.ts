import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';

export interface ChecklistItem {
  id: string;
  checklist_id: string;
  title: string;
  description?: string;
  position: number;
  required_photo_count: number;
  estimated_duration_minutes?: number;
  category?: string;
  is_completed: boolean;
  completed_at?: string;
  completed_by?: string;
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface Checklist {
  id: string;
  job_id: string;
  business_id: string;
  template_id?: string;
  title: string;
  assigned_to?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  items?: ChecklistItem[];
}

export interface ChecklistProgress {
  completed: number;
  total: number;
  percentage: number;
}

export function useJobChecklist(jobId: string | undefined) {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['job-checklist', jobId],
    queryFn: async () => {
      if (!jobId) return null;

      const { data, error } = await authApi.invoke(
        `checklists-crud?jobId=${jobId}`,
        { method: 'GET' }
      );

      if (error) throw error;
      return data;
    },
    enabled: !!jobId,
  });

  // Real-time subscription
  useEffect(() => {
    if (!query.data?.checklist?.id) return;

    const checklistId = query.data.checklist.id;
    
    const channel = supabase
      .channel(`checklist:${checklistId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sg_checklist_items',
          filter: `checklist_id=eq.${checklistId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['job-checklist', jobId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sg_checklists',
          filter: `id=eq.${checklistId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['job-checklist', jobId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [query.data?.checklist?.id, jobId, queryClient]);

  return query;
}

export function useCreateChecklist() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async (params: {
      jobId: string;
      templateId?: string;
      title?: string;
      assignedTo?: string;
    }) => {
      const { data, error } = await authApi.invoke('checklists-crud', {
        method: 'POST',
        body: {
          ...params,
          businessId,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job-checklist', variables.jobId] });
      toast.success('Checklist created!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create checklist: ${error.message}`);
    },
  });
}

export function useCompleteChecklistItem() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      itemId: string;
      isCompleted: boolean;
      jobId: string;
    }) => {
      const { data, error } = await authApi.invoke('checklist-item-complete', {
        method: 'POST',
        body: {
          itemId: params.itemId,
          isCompleted: params.isCompleted,
        },
      });

      if (error || !data.success) {
        throw new Error(data?.error || error?.message || 'Failed to update item');
      }
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job-checklist', variables.jobId] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}