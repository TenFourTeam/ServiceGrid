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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    const ctx = await requireCtx(supabase, authHeader);

    console.log('[Google Drive Disconnect] Disconnecting for business:', ctx.businessId);

    // Get connection
    const { data: connection } = await supabase
      .from('google_drive_connections')
      .select('*')
      .eq('business_id', ctx.businessId)
      .eq('is_active', true)
      .single();

    if (connection) {
      // TODO: Revoke tokens with Google when API credentials available
      
      // Deactivate connection
      await supabase
        .from('google_drive_connections')
        .update({ is_active: false, sync_enabled: false })
        .eq('id', connection.id);

      console.log('[Google Drive Disconnect] Connection deactivated');
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Google Drive disconnected successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive Disconnect Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
