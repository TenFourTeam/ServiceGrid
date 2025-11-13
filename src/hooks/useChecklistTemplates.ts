import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';
import { toast } from 'sonner';

export interface ChecklistTemplate {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  category?: string;
  is_system_template: boolean;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  item_count?: number;
}

export interface ChecklistTemplateItem {
  id: string;
  template_id: string;
  title: string;
  description?: string;
  position: number;
  required_photo_count: number;
  estimated_duration_minutes?: number;
  category?: string;
}

export function useChecklistTemplates() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery({
    queryKey: ['checklist-templates', businessId],
    queryFn: async () => {
      if (!businessId) return [];

      const { data, error } = await authApi.invoke(
        `checklist-templates-crud?businessId=${businessId}`,
        { method: 'GET' }
      );

      if (error) throw error;
      return (data?.templates || []) as ChecklistTemplate[];
    },
    enabled: !!businessId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useChecklistTemplate(templateId: string | null) {
  const authApi = useAuthApi();

  return useQuery({
    queryKey: ['checklist-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await authApi.invoke(
        `checklist-templates-crud/${templateId}`,
        { method: 'GET' }
      );

      if (error) throw error;
      return data?.template as (ChecklistTemplate & { items: ChecklistTemplateItem[] }) | null;
    },
    enabled: !!templateId,
  });
}

export function useCreateChecklistTemplate() {
  const authApi = useAuthApi();
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();

  return useMutation({
    mutationFn: async (params: {
      name: string;
      description?: string;
      category?: string;
      items: Array<{
        title: string;
        description?: string;
        position: number;
        required_photo_count?: number;
        estimated_duration_minutes?: number;
        category?: string;
      }>;
    }) => {
      const { data, error } = await authApi.invoke('checklist-templates-crud', {
        method: 'POST',
        body: {
          businessId,
          ...params,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist-templates'] });
      toast.success('Template created successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create template: ${error.message}`);
    },
  });
}