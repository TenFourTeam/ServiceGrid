import { useQuery } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuth } from '@clerk/clerk-react';
import { createAuthEdgeApi } from "@/utils/authEdgeApi";

export interface AuditLog {
  id: string;
  business_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function useAuditLogs(businessId?: string, opts?: { enabled?: boolean }) {
  const { isAuthenticated } = useBusinessContext();
  const { getToken } = useAuth();
  const authApi = createAuthEdgeApi(getToken);
  const enabled = !!isAuthenticated && !!businessId && (opts?.enabled ?? true);

  return useQuery<AuditLog[], Error>({
    queryKey: ["audit-logs", businessId],
    enabled,
    queryFn: async () => {
      if (!businessId) return [];
      
      console.info("[useAuditLogs] fetching audit logs via edge function");
      
      const { data, error } = await authApi.invoke('audit-logs-crud', {
        method: 'GET'
      });

      if (error) {
        console.error("[useAuditLogs] error:", error);
        throw new Error(error.message || 'Failed to fetch audit logs');
      }
      
      console.info("[useAuditLogs] fetched", data?.auditLogs?.length || 0, "audit logs");
      
      return data?.auditLogs || [];
    },
    staleTime: 30_000,
  });
}