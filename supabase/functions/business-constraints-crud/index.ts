import { corsHeaders } from '../_shared/cors.ts';
import { requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const method = req.method;
    const url = new URL(req.url);
    const businessId = url.searchParams.get('businessId');
    
    // Authenticate using Clerk
    const { userId, businessId: contextBusinessId, supaAdmin } = await requireCtx(req, {
      businessId: businessId || undefined
    });

    const finalBusinessId = businessId || contextBusinessId;
    const body = method !== 'GET' ? await req.json() : null;

    console.log(`[business-constraints-crud] ${method} request from user ${userId} for business ${finalBusinessId}`);

    // GET - List constraints for a business
    if (method === 'GET') {
      if (!finalBusinessId) {
        throw new Error('businessId is required');
      }

      const { data, error } = await supaAdmin
        .from('business_constraints')
        .select('*')
        .eq('business_id', finalBusinessId)
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
      const { data, error } = await supaAdmin
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

      const { data, error } = await supaAdmin
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

      const { error } = await supaAdmin
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
