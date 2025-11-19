import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthApi } from './useAuthApi';
import { useBusinessContext } from './useBusinessContext';
import { toast } from 'sonner';

export interface ServiceCatalogItem {
  id: string;
  business_id: string;
  service_name: string;
  description?: string;
  unit_price: number;
  unit_type: string;
  category?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceInput {
  service_name: string;
  description?: string;
  unit_price: number;
  unit_type: string;
  category?: string;
}

export interface UpdateServiceInput extends Partial<CreateServiceInput> {
  is_active?: boolean;
}

export function useServiceCatalog() {
  const authApi = useAuthApi();
  const { businessId } = useBusinessContext();
  const queryClient = useQueryClient();

  const servicesQuery = useQuery({
    queryKey: ['service-catalog', businessId],
    queryFn: async () => {
      const { data, error } = await authApi.invoke('service-catalog-crud', {
        method: 'GET',
      });
      if (error) throw new Error(error.message);
      return (data?.services || []) as ServiceCatalogItem[];
    },
    enabled: !!businessId,
  });

  const createService = useMutation({
    mutationFn: async (input: CreateServiceInput) => {
      const { data, error } = await authApi.invoke('service-catalog-crud', {
        method: 'POST',
        body: input,
      });
      if (error) throw new Error(error.message);
      return data?.service as ServiceCatalogItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalog', businessId] });
      toast.success('Service added to catalog');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create service: ${error.message}`);
    },
  });

  const updateService = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateServiceInput }) => {
      const { data, error } = await authApi.invoke(`service-catalog-crud?id=${id}`, {
        method: 'PATCH',
        body: updates,
      });
      if (error) throw new Error(error.message);
      return data?.service as ServiceCatalogItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalog', businessId] });
      toast.success('Service updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update service: ${error.message}`);
    },
  });

  const deleteService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await authApi.invoke(`service-catalog-crud?id=${id}`, {
        method: 'DELETE',
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-catalog', businessId] });
      toast.success('Service deleted');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete service: ${error.message}`);
    },
  });

  return {
    services: servicesQuery.data || [],
    isLoading: servicesQuery.isLoading,
    error: servicesQuery.error,
    createService,
    updateService,
    deleteService,
  };
}
