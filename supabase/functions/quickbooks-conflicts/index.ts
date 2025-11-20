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

    // GET - List unresolved conflicts
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('quickbooks_conflict_resolutions')
        .select('*')
        .eq('business_id', ctx.businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Resolve conflict
    if (req.method === 'POST') {
      const body = await req.json();
      const { conflictId, resolution, resolvedData } = body;

      const { data, error } = await supabase
        .from('quickbooks_conflict_resolutions')
        .update({
          resolution,
          resolved_data: resolvedData,
          resolved_by: ctx.userId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', conflictId)
        .eq('business_id', ctx.businessId)
        .select()
        .single();

      if (error) throw error;

      // TODO: Apply the resolution by syncing the resolved data

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QB Conflicts Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
