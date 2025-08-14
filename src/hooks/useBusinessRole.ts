import { useQuery } from "@tanstack/react-query";
import { useAuthSnapshot } from "@/auth";
import { edgeRequest } from "@/utils/edgeApi";
import { fn } from "@/utils/functionUrl";

export interface BusinessRoleData {
  role: 'owner' | 'worker' | null;
  canManage: boolean;
}

export function useBusinessRole(businessId?: string) {
  const { snapshot } = useAuthSnapshot();
  const enabled = snapshot.phase === 'authenticated' && !!businessId;

  return useQuery<BusinessRoleData, Error>({
    queryKey: ["business-role", businessId],
    enabled,
    queryFn: async () => {
      if (!businessId) return { role: null, canManage: false };
      
      const data = await edgeRequest(`${fn('business-role')}?business_id=${businessId}`, {
        method: 'GET',
      });
      
      return {
        role: data?.role || null,
        canManage: data?.role === 'owner',
      };
    },
    staleTime: 30_000,
  });
}