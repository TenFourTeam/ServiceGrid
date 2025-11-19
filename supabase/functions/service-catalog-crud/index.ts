import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { requireCtx } from '../_shared/authContext.ts';

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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const serviceId = url.searchParams.get('id');

    // GET - List or single service
    if (req.method === 'GET') {
      if (serviceId) {
        const { data, error } = await supabase
          .from('service_catalog')
          .select('*')
          .eq('id', serviceId)
          .eq('business_id', ctx.businessId)
          .single();

        if (error) throw error;
        return new Response(JSON.stringify({ service: data }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data, error } = await supabase
        .from('service_catalog')
        .select('*')
        .eq('business_id', ctx.businessId)
        .order('category', { ascending: true })
        .order('service_name', { ascending: true });

      if (error) throw error;
      return new Response(JSON.stringify({ services: data || [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create service
    if (req.method === 'POST') {
      const body = await req.json();
      const { service_name, description, unit_price, unit_type, category } = body;

      if (!service_name || unit_price === undefined || !unit_type) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabase
        .from('service_catalog')
        .insert({
          business_id: ctx.businessId,
          service_name,
          description,
          unit_price: parseInt(unit_price),
          unit_type,
          category,
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ service: data }), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PATCH - Update service
    if (req.method === 'PATCH') {
      if (!serviceId) {
        return new Response(
          JSON.stringify({ error: 'Service ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const body = await req.json();
      const updates: any = {};
      
      if (body.service_name !== undefined) updates.service_name = body.service_name;
      if (body.description !== undefined) updates.description = body.description;
      if (body.unit_price !== undefined) updates.unit_price = parseInt(body.unit_price);
      if (body.unit_type !== undefined) updates.unit_type = body.unit_type;
      if (body.category !== undefined) updates.category = body.category;
      if (body.is_active !== undefined) updates.is_active = body.is_active;

      const { data, error } = await supabase
        .from('service_catalog')
        .update(updates)
        .eq('id', serviceId)
        .eq('business_id', ctx.businessId)
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify({ service: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Delete service
    if (req.method === 'DELETE') {
      if (!serviceId) {
        return new Response(
          JSON.stringify({ error: 'Service ID required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { error } = await supabase
        .from('service_catalog')
        .delete()
        .eq('id', serviceId)
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
    console.error('Service catalog CRUD error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
