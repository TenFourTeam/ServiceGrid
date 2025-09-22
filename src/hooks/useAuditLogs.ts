import { useQuery } from "@tanstack/react-query";
import { useBusinessContext } from "@/hooks/useBusinessContext";
import { useAuthApi } from "@/hooks/useAuthApi";
import { getErrorMessage, hasProperty } from "@/utils/apiHelpers";

export interface AuditLog {
  id: string;
  business_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function useAuditLogs(businessId?: string, opts?: { enabled?: boolean }) {
  const { isAuthenticated } = useBusinessContext();
  const authApi = useAuthApi();
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
        throw new Error(getErrorMessage(error, 'Failed to fetch audit logs'));
      }
      
      const auditLogs = hasProperty(data, 'auditLogs') ? (data.auditLogs as AuditLog[]) : [];
      console.info("[useAuditLogs] fetched", auditLogs.length, "audit logs");
      
      return auditLogs;
    },
    staleTime: 30_000,
  });
}