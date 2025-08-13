import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { edgeFetchJson } from "@/utils/edgeApi";

export interface BusinessRoleData {
  role: 'owner' | 'worker' | null;
  canManage: boolean;
}

export function useBusinessRole(businessId?: string) {
  const { isSignedIn, getToken } = useClerkAuth();
  const enabled = !!isSignedIn && !!businessId;

  return useQuery<BusinessRoleData, Error>({
    queryKey: ["business-role", businessId],
    enabled,
    queryFn: async () => {
      if (!businessId) return { role: null, canManage: false };
      
      const data = await edgeFetchJson(`business-role?business_id=${businessId}`, getToken);
      return {
        role: data?.role || null,
        canManage: data?.role === 'owner',
      };
    },
    staleTime: 30_000,
  });
}