import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useBusinessContext } from './useBusinessContext';
import { useAuthApi } from '@/hooks/useAuthApi';
import { toast } from 'sonner';
import { RequestListItem } from './useRequestsData';
import { invalidationHelpers } from '@/queries/keys';

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

      if (error) throw new Error((error as any)?.message || 'Failed to create request');
      return (result as any)?.data || result;
    },
    onSuccess: () => {
      invalidationHelpers.requests(queryClient, businessId!);
      toast.success('Request created successfully');
    },
    onError: (error) => {
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

      if (error) throw new Error((error as any)?.message || 'Failed to update request');
      return (result as any)?.data || result;
    },
    onSuccess: () => {
      invalidationHelpers.requests(queryClient, businessId!);
      toast.success('Request updated successfully');
    },
    onError: (error) => {
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

      if (error) throw new Error((error as any)?.message || 'Failed to delete request');
    },
    onSuccess: () => {
      invalidationHelpers.requests(queryClient, businessId!);
      toast.success('Request deleted successfully');
    },
    onError: (error) => {
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