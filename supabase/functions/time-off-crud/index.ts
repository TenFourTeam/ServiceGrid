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
    const userIdParam = url.searchParams.get('userId');
    const status = url.searchParams.get('status');
    
    // Authenticate using Clerk
    const { userId, businessId: contextBusinessId, supaAdmin } = await requireCtx(req, {
      businessId: businessId || undefined
    });

    const finalBusinessId = businessId || contextBusinessId;
    const body = method !== 'GET' ? await req.json() : null;

    console.log(`[time-off-crud] ${method} request from user ${userId} for business ${finalBusinessId}`);

    // GET - List time off requests
    if (method === 'GET') {
      if (!finalBusinessId) {
        throw new Error('businessId is required');
      }

      let query = supaAdmin
        .from('time_off_requests')
        .select(`
          *,
          user:user_id(id, full_name, email),
          reviewer:reviewed_by(id, full_name)
        `)
        .eq('business_id', finalBusinessId)
        .order('start_date', { ascending: false });

      if (userIdParam) {
        query = query.eq('user_id', userIdParam);
      }

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create time off request
    if (method === 'POST') {
      const { business_id, user_id, start_date, end_date, reason } = body;

      const { data, error } = await supaAdmin
        .from('time_off_requests')
        .insert({
          business_id,
          user_id,
          start_date,
          end_date,
          reason,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[time-off-crud] Created time off request:', data.id);

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT - Update time off request (approve/deny or edit)
    if (method === 'PUT') {
      const { id, status: newStatus, ...updates } = body;

      if (!id) {
        throw new Error('id is required for update');
      }

      const updateData: any = { ...updates };

      // If status is being changed to approved/denied, record who reviewed it
      if (newStatus && (newStatus === 'approved' || newStatus === 'denied')) {
        updateData.status = newStatus;
        updateData.reviewed_by = userId;
        updateData.reviewed_at = new Date().toISOString();
      }

      const { data, error } = await supaAdmin
        .from('time_off_requests')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log('[time-off-crud] Updated time off request:', id);

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Delete time off request
    if (method === 'DELETE') {
      const { id } = body;

      if (!id) {
        throw new Error('id is required for delete');
      }

      const { error } = await supaAdmin
        .from('time_off_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('[time-off-crud] Deleted time off request:', id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Method not allowed');

  } catch (error) {
    console.error('[time-off-crud] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
