import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from './useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import { RequestListItem } from './useRequestsData';
import { invalidationHelpers, queryKeys } from '@/queries/keys';
import { feedback } from '@/utils/feedback';

interface CreateRequestData {
  customer_id: string;
  title: string;
  property_address?: string;
  service_details: string;
  preferred_assessment_date?: string;
  alternative_date?: string;
  preferred_times?: string[];
  status?: 'New' | 'Reviewed' | 'Scheduled' | 'Assessed' | 'Archived';
  notes?: string;
  owner_id: string;
}

interface UpdateRequestData {
  id: string;
  customer_id?: string;
  title?: string;
  property_address?: string;
  service_details?: string;
  preferred_assessment_date?: string;
  alternative_date?: string;
  preferred_times?: string[];
  status?: 'New' | 'Reviewed' | 'Scheduled' | 'Assessed' | 'Archived';
  notes?: string;
  assigned_to?: string | null;
}

export function useRequestOperations() {
  const queryClient = useQueryClient();
  const { businessId } = useBusinessContext();
  const authApi = useAuthApi();

  const createRequest = useMutation({
    mutationFn: async (data: CreateRequestData): Promise<RequestListItem> => {
      const { data: result, error } = await authApi.invoke('requests-crud', {
        method: 'POST',
        body: data,
      });

      if (error) throw new Error(error.message || 'Failed to create request');
      return result.data;
    },
    onMutate: async (newRequest) => {
      feedback.optimisticStart();
      await queryClient.cancelQueries({ queryKey: queryKeys.data.requests(businessId!) });
      const previous = queryClient.getQueryData(queryKeys.data.requests(businessId!));
      
      // Optimistically add new request
      const optimisticRequest = {
        id: `temp-${Date.now()}`,
        ...newRequest,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customer: null,
        assigned_user: null,
        _optimistic: true,
      };
      
      queryClient.setQueryData(queryKeys.data.requests(businessId!), (old: any) => ({
        ...old,
        data: [optimisticRequest, ...(old?.data || [])],
      }));
      
      return { previous };
    },
    onSuccess: () => {
      feedback.optimisticConfirm();
      invalidationHelpers.requests(queryClient, businessId!);
      toast.success('Request created successfully');
    },
    onError: (error, _, context) => {
      feedback.error();
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.data.requests(businessId!), context.previous);
      }
      console.error('Error creating request:', error);
      toast.error('Failed to create request');
    },
  });

  const updateRequest = useMutation({
    mutationFn: async (data: UpdateRequestData): Promise<RequestListItem> => {
      const { data: result, error } = await authApi.invoke('requests-crud', {
        method: 'PUT',
        body: data,
      });

      if (error) throw new Error(error.message || 'Failed to update request');
      return result.data;
    },
    onMutate: async (updatedRequest) => {
      feedback.optimisticStart();
      await queryClient.cancelQueries({ queryKey: queryKeys.data.requests(businessId!) });
      const previous = queryClient.getQueryData(queryKeys.data.requests(businessId!));
      
      // Optimistically update request
      queryClient.setQueryData(queryKeys.data.requests(businessId!), (old: any) => ({
        ...old,
        data: old?.data?.map((r: RequestListItem) =>
          r.id === updatedRequest.id ? { ...r, ...updatedRequest, _optimistic: true } : r
        ) || [],
      }));
      
      return { previous };
    },
    onSuccess: () => {
      feedback.optimisticConfirm();
      invalidationHelpers.requests(queryClient, businessId!);
      toast.success('Request updated successfully');
    },
    onError: (error, _, context) => {
      feedback.error();
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.data.requests(businessId!), context.previous);
      }
      console.error('Error updating request:', error);
      toast.error('Failed to update request');
    },
  });

  const deleteRequest = useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await authApi.invoke('requests-crud', {
        method: 'DELETE',
        body: { id },
      });

      if (error) throw new Error(error.message || 'Failed to delete request');
    },
    onMutate: async (id) => {
      feedback.optimisticStart();
      await queryClient.cancelQueries({ queryKey: queryKeys.data.requests(businessId!) });
      const previous = queryClient.getQueryData(queryKeys.data.requests(businessId!));
      
      // Optimistically remove request
      queryClient.setQueryData(queryKeys.data.requests(businessId!), (old: any) => ({
        ...old,
        data: old?.data?.filter((r: RequestListItem) => r.id !== id) || [],
      }));
      
      return { previous };
    },
    onSuccess: () => {
      feedback.optimisticConfirm();
      invalidationHelpers.requests(queryClient, businessId!);
      toast.success('Request deleted successfully');
    },
    onError: (error, _, context) => {
      feedback.error();
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.data.requests(businessId!), context.previous);
      }
      console.error('Error deleting request:', error);
      toast.error('Failed to delete request');
    },
  });

  return {
    createRequest,
    updateRequest,
    deleteRequest,
  };
}