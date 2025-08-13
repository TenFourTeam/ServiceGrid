import { useQuery } from "@tanstack/react-query";
import { useAuth as useClerkAuth } from "@clerk/clerk-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
  const { isSignedIn } = useClerkAuth();
  const enabled = !!isSignedIn && !!businessId && (opts?.enabled ?? true);

  return useQuery<AuditLog[], Error>({
    queryKey: ["audit-logs", businessId],
    enabled,
    queryFn: async () => {
      if (!businessId) return [];
      
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      return (data || []).map((log): AuditLog => ({
        id: log.id,
        business_id: log.business_id,
        user_id: log.user_id,
        action: log.action,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        details: typeof log.details === 'object' && log.details ? log.details as Record<string, any> : {},
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        created_at: log.created_at,
      }));
    },
    staleTime: 30_000,
  });
}