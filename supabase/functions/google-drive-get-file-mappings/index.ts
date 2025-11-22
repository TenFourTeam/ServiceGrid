import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { requireCtx } from '../_lib/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { entityType, entityId } = await req.json();

    console.log('[Google Drive Get Mappings] Fetching mappings for:', entityType, entityId);

    // Get connection
    const { data: connection } = await ctx.supaAdmin
      .from('google_drive_connections')
      .select('*')
      .eq('business_id', ctx.businessId)
      .eq('is_active', true)
      .single();

    if (!connection) {
      return new Response(JSON.stringify({ success: true, mappings: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch mappings
    let query = ctx.supaAdmin
      .from('google_drive_file_mappings')
      .select('*')
      .eq('business_id', ctx.businessId);

    if (entityType) {
      query = query.eq('sg_entity_type', entityType);
    }
    if (entityId) {
      query = query.eq('sg_entity_id', entityId);
    }

    const { data: mappings, error } = await query;

    if (error) throw error;

    console.log('[Google Drive Get Mappings] Found', mappings?.length, 'mappings');

    return new Response(JSON.stringify({ success: true, mappings }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive Get Mappings Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
