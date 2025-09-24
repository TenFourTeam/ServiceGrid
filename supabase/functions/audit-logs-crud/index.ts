import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  try {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Require authentication context
    const ctx = await requireCtx(req);
    const { businessId, supaAdmin } = ctx;

    // GET: Fetch audit logs for the business
    if (req.method === 'GET') {
      console.info('[audit-logs-crud] GET: Fetching audit logs for business:', businessId);

      const { data, error } = await supaAdmin
        .from('audit_logs')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('[audit-logs-crud] GET: Error fetching audit logs:', error);
        return json({ error: error.message }, { status: 500 });
      }

      console.info(`[audit-logs-crud] GET: Successfully fetched ${data?.length || 0} audit logs`);

      return json({
        auditLogs: data || [],
        count: data?.length || 0
      });
    }

    // Method not allowed
    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error) {
    console.error('[audit-logs-crud] Error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});