import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[business-constraints-crud] Auth error:', authError);
      throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    const method = req.method;
    const body = method !== 'GET' ? await req.json() : null;

    console.log(`[business-constraints-crud] ${method} request from user ${profile.id}`);

    // GET - List constraints for a business
    if (method === 'GET') {
      const url = new URL(req.url);
      const businessId = url.searchParams.get('businessId');

      if (!businessId) {
        throw new Error('businessId is required');
      }

      const { data, error } = await supabase
        .from('business_constraints')
        .select('*')
        .eq('business_id', businessId)
        .order('constraint_type', { ascending: true });

      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create or upsert constraint
    if (method === 'POST') {
      const { business_id, constraint_type, constraint_value, is_active } = body;

      // Use upsert to handle unique constraint
      const { data, error } = await supabase
        .from('business_constraints')
        .upsert({
          business_id,
          constraint_type,
          constraint_value,
          is_active: is_active ?? true,
        }, {
          onConflict: 'business_id,constraint_type'
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[business-constraints-crud] Upserted constraint:', data.id);

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT - Update constraint
    if (method === 'PUT') {
      const { id, ...updates } = body;

      if (!id) {
        throw new Error('id is required for update');
      }

      const { data, error } = await supabase
        .from('business_constraints')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log('[business-constraints-crud] Updated constraint:', id);

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Delete constraint
    if (method === 'DELETE') {
      const { id } = body;

      if (!id) {
        throw new Error('id is required for delete');
      }

      const { error } = await supabase
        .from('business_constraints')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('[business-constraints-crud] Deleted constraint:', id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Method not allowed');

  } catch (error) {
    console.error('[business-constraints-crud] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
