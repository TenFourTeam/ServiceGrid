import { useQuery } from "@tanstack/react-query";
import { useAuthSnapshot } from "@/auth";
import { useApiClient } from "@/auth";

export interface BusinessRoleData {
  role: 'owner' | 'worker' | null;
  canManage: boolean;
}

export function useBusinessRole(businessId?: string) {
  const { snapshot } = useAuthSnapshot();
  const apiClient = useApiClient();
  const enabled = snapshot.phase === 'authenticated' && !!businessId;

  return useQuery<BusinessRoleData, Error>({
    queryKey: ["business-role", businessId],
    enabled,
    queryFn: async () => {
      if (!businessId) return { role: null, canManage: false };
      
      const response = await apiClient.get(`/business-role?business_id=${businessId}`);
      if (response.error) throw new Error(response.error);
      const data = response.data;
      return {
        role: data?.role || null,
        canManage: data?.role === 'owner',
      };
    },
    staleTime: 30_000,
  });
}