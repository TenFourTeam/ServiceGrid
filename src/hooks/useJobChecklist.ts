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
  currentPhotoCount?: number;
  photos?: any[];
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
  status?: string;
  approved_by?: string;
  approved_at?: string;
  version?: number;
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
      
      // Fetch photo counts for each item if checklist exists
      if (data?.checklist?.items) {
        const itemsWithPhotos = await Promise.all(
          data.checklist.items.map(async (item: ChecklistItem) => {
            const { data: mediaData } = await authApi.invoke(
              `job-media-crud?jobId=${jobId}`,
              { method: 'GET' }
            );
            
            const photos = mediaData?.media?.filter(
              (m: any) => m.checklist_item_id === item.id
            ) || [];
            
            return {
              ...item,
              currentPhotoCount: photos.length,
              photos,
            };
          })
        );
        
        data.checklist.items = itemsWithPhotos;
      }
      
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
      console.log('🔧 [useCreateChecklist] Mutation started with params:', params);
      console.log('🔧 [useCreateChecklist] businessId:', businessId);
      
      const { data, error } = await authApi.invoke('checklists-crud', {
        method: 'POST',
        body: {
          ...params,
          businessId,
        },
      });

      console.log('🔧 [useCreateChecklist] Response:', { data, error });

      if (error) {
        console.error('❌ [useCreateChecklist] Error:', error);
        throw error;
      }
      return data;
    },
    onSuccess: (_, variables) => {
      console.log('✅ [useCreateChecklist] Success, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['job-checklist', variables.jobId] });
      toast.success('Checklist created!');
    },
    onError: (error: Error) => {
      console.error('❌ [useCreateChecklist] onError:', error);
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
    onMutate: async (params) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['job-checklist', params.jobId] });
      
      // Snapshot previous state
      const previous = queryClient.getQueryData(['job-checklist', params.jobId]);
      
      // Optimistically update the cache
      queryClient.setQueryData(['job-checklist', params.jobId], (old: any) => {
        if (!old) return old;
        
        // Update the specific item
        const updatedItems = old.items?.map((item: ChecklistItem) => 
          item.id === params.itemId 
            ? { 
                ...item, 
                is_completed: params.isCompleted,
                completed_at: params.isCompleted ? new Date().toISOString() : null 
              }
            : item
        );
        
        // Recalculate progress
        const completedCount = updatedItems?.filter((item: ChecklistItem) => item.is_completed).length || 0;
        const totalCount = updatedItems?.length || 0;
        const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        
        return {
          ...old,
          items: updatedItems,
          progress: {
            ...old.progress,
            completed_count: completedCount,
            completion_percent: completionPercent,
            is_complete: completionPercent === 100
          }
        };
      });
      
      return { previous };
    },
    onError: (error: Error, variables, context: any) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['job-checklist', variables.jobId], context.previous);
      }
      toast.error(error.message);
    },
    onSettled: (_, __, variables) => {
      // Always refetch to sync with server
      queryClient.invalidateQueries({ queryKey: ['job-checklist', variables.jobId] });
    },
  });
}

export function useAddChecklistItem() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      checklistId: string;
      title: string;
      description?: string;
      category?: string;
      required_photo_count?: number;
      jobId: string;
    }) => {
      const { data, error } = await authApi.invoke(
        `checklists-crud/${params.checklistId}/items`,
        {
          method: 'POST',
          body: {
            title: params.title,
            description: params.description,
            category: params.category,
            required_photo_count: params.required_photo_count,
          },
        }
      );

      if (error) throw new Error(error.message || 'Failed to add task');
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job-checklist', variables.jobId] });
      toast.success('Task added successfully!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}