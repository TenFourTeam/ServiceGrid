import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RoadmapFeature {
  id: string;
  title: string;
  description: string;
  status: 'under-consideration' | 'planned' | 'in-progress' | 'shipped' | 'unlikely';
  vote_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

interface FeaturesFilters {
  status?: string;
  sortBy?: 'votes' | 'newest' | 'oldest';
}

export function useRoadmapFeatures(filters?: FeaturesFilters) {
  return useQuery({
    queryKey: ['roadmap-features', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.set('status', filters.status);
      if (filters?.sortBy) params.set('sortBy', filters.sortBy);

      const { data, error } = await supabase.functions.invoke('roadmap-features-crud', {
        method: 'GET',
        body: params,
      });

      if (error) throw error;
      return data as RoadmapFeature[];
    },
  });
}

export function useRoadmapFeature(id: string) {
  return useQuery({
    queryKey: ['roadmap-feature', id],
    queryFn: async () => {
      const params = new URLSearchParams({ id });
      const { data, error } = await supabase.functions.invoke('roadmap-features-crud', {
        method: 'GET',
        body: params,
      });

      if (error) throw error;
      return data as RoadmapFeature;
    },
    enabled: !!id,
  });
}

export function useCreateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feature: { title: string; description: string; status?: string }) => {
      const { data, error } = await supabase.functions.invoke('roadmap-features-crud', {
        method: 'POST',
        body: feature,
      });

      if (error) throw error;
      return data as RoadmapFeature;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-features'] });
      toast.success('Feature created successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create feature');
    },
  });
}

export function useUpdateFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (feature: {
      id: string;
      title?: string;
      description?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('roadmap-features-crud', {
        method: 'PATCH',
        body: feature,
      });

      if (error) throw error;
      return data as RoadmapFeature;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-features'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap-feature', variables.id] });
      toast.success('Feature updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update feature');
    },
  });
}

export function useDeleteFeature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke('roadmap-features-crud', {
        method: 'DELETE',
        body: { id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap-features'] });
      toast.success('Feature deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete feature');
    },
  });
}
