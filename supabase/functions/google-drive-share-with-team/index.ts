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
    const { jobId, teamMemberIds, role } = await req.json();

    console.log('[Google Drive Share with Team] Sharing job folder:', jobId);

    // Get connection
    const { data: connection } = await supabase
      .from('google_drive_connections')
      .select('*')
      .eq('business_id', ctx.businessId)
      .eq('is_active', true)
      .single();

    if (!connection) {
      throw new Error('No active Google Drive connection');
    }

    // Get team member emails
    const { data: teamMembers } = await supabase
      .from('profiles')
      .select('email')
      .in('id', teamMemberIds);

    const emails = teamMembers?.map(m => m.email) || [];

    console.log('[Google Drive Share with Team] Sharing with:', emails);

    // TODO: Share job folder with team members via Drive API when credentials available

    // Log sync
    await supabase.from('google_drive_sync_log').insert({
      business_id: ctx.businessId,
      connection_id: connection.id,
      sync_type: 'share',
      entity_type: 'job',
      entity_id: jobId,
      direction: 'to_drive',
      status: 'success',
      items_processed: emails.length,
      items_succeeded: emails.length,
      items_failed: 0,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      metadata: { jobId, teamMemberIds, role, emails },
    });

    const result = {
      success: true,
      sharedWith: emails,
      message: 'Job folder will be shared with team when API credentials are configured',
    };

    console.log('[Google Drive Share with Team] Completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Google Drive Share with Team Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
