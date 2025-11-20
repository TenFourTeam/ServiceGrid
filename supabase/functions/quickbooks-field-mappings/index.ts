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

    // GET - List field mappings
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('quickbooks_field_mappings')
        .select('*')
        .eq('business_id', ctx.businessId)
        .order('entity_type', { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create field mapping
    if (req.method === 'POST') {
      const body = await req.json();
      const { entity_type, sg_field, qb_field, transform_function, is_required } = body;

      const { data, error } = await supabase
        .from('quickbooks_field_mappings')
        .insert({
          business_id: ctx.businessId,
          entity_type,
          sg_field,
          qb_field,
          transform_function,
          is_required: is_required || false,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH - Update field mapping
    if (req.method === 'PATCH') {
      const body = await req.json();
      const { id, ...updates } = body;

      const { data, error } = await supabase
        .from('quickbooks_field_mappings')
        .update(updates)
        .eq('id', id)
        .eq('business_id', ctx.businessId)
        .select()
        .single();

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Delete field mapping
    if (req.method === 'DELETE') {
      const body = await req.json();
      const { id } = body;

      const { error } = await supabase
        .from('quickbooks_field_mappings')
        .delete()
        .eq('id', id)
        .eq('business_id', ctx.businessId);

      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[QB Field Mappings Error]:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
