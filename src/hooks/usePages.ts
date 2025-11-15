import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from '@/hooks/useAuthApi';
import { useBusinessContext } from '@/hooks/useBusinessContext';

export interface Page {
  id: string;
  business_id: string;
  job_id: string | null;
  title: string;
  content_json: any;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  icon: string | null;
  parent_page_id: string | null;
  position: number;
  created_by_profile?: {
    id: string;
    full_name: string;
  };
  collaborators?: PageCollaborator[];
}

export interface PageCollaborator {
  user_id: string;
  last_viewed_at: string;
  last_edited_at: string | null;
  cursor_position: any;
  is_viewing: boolean;
  profile: {
    id: string;
    full_name: string;
  };
}

export function usePages(jobId?: string) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery<Page[]>({
    queryKey: ['pages', businessId, jobId],
    queryFn: async () => {
      if (!businessId) return [];

      const params: any = {};
      if (jobId) params.jobId = jobId;

      const { data, error } = await authApi.invoke('pages-crud', {
        method: 'GET',
        queryParams: params,
      });

      if (error) throw new Error(error.message);
      return data?.pages || [];
    },
    enabled: !!businessId,
  });
}

export function usePage(pageId: string | undefined) {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();

  return useQuery<Page>({
    queryKey: ['page', businessId, pageId],
    queryFn: async () => {
      if (!businessId || !pageId) throw new Error('Missing required params');

      const { data, error } = await authApi.invoke('pages-crud', {
        method: 'GET',
        queryParams: { pageId },
      });

      if (error) throw new Error(error.message);
      return data?.page;
    },
    enabled: !!businessId && !!pageId,
    refetchInterval: 5000,
  });
}

export function useCreatePage() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pageData: Partial<Page>) => {
      const { data, error } = await authApi.invoke('pages-crud', {
        method: 'POST',
        body: JSON.stringify({
          title: pageData.title,
          jobId: pageData.job_id,
          contentJson: pageData.content_json,
          icon: pageData.icon,
          parentPageId: pageData.parent_page_id,
          position: pageData.position,
        }),
      });

      if (error) throw new Error(error.message);
      return data?.page;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages', businessId] });
    },
  });
}

export function useUpdatePage() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pageId, updates }: { pageId: string; updates: Partial<Page> & { createVersion?: boolean; changeSummary?: string } }) => {
      const { data, error } = await authApi.invoke('pages-crud', {
        method: 'PATCH',
        queryParams: { pageId },
        body: JSON.stringify({
          title: updates.title,
          icon: updates.icon,
          contentJson: updates.content_json,
          isArchived: updates.is_archived,
          position: updates.position,
          createVersion: updates.createVersion,
          changeSummary: updates.changeSummary,
        }),
      });

      if (error) throw new Error(error.message);
      return data?.page;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['page', businessId, variables.pageId] });
      queryClient.invalidateQueries({ queryKey: ['pages', businessId] });
    },
  });
}

export function useDeletePage() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pageId: string) => {
      const { error } = await authApi.invoke('pages-crud', {
        method: 'DELETE',
        queryParams: { pageId },
      });

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages', businessId] });
    },
  });
}