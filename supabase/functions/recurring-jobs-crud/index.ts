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
      console.error('[recurring-jobs-crud] Auth error:', authError);
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

    console.log(`[recurring-jobs-crud] ${method} request from user ${profile.id}`);

    // GET - List recurring job templates
    if (method === 'GET') {
      const url = new URL(req.url);
      const businessId = url.searchParams.get('businessId');

      if (!businessId) {
        throw new Error('businessId is required');
      }

      const { data, error } = await supabase
        .from('recurring_job_templates')
        .select(`
          *,
          customer:customer_id(id, name, email, address)
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create recurring job template
    if (method === 'POST') {
      const {
        business_id,
        customer_id,
        title,
        address,
        notes,
        estimated_duration_minutes,
        recurrence_pattern,
        recurrence_config,
        start_date,
        end_date,
        auto_schedule,
        preferred_time_window,
        assigned_members,
      } = body;

      // Calculate next generation date based on pattern
      const startDate = new Date(start_date);
      const nextGenerationDate = startDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('recurring_job_templates')
        .insert({
          business_id,
          customer_id,
          title,
          address,
          notes,
          estimated_duration_minutes: estimated_duration_minutes || 60,
          recurrence_pattern,
          recurrence_config,
          start_date,
          end_date,
          is_active: true,
          auto_schedule: auto_schedule || false,
          preferred_time_window,
          assigned_members: assigned_members || [],
          next_generation_date: nextGenerationDate,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[recurring-jobs-crud] Created template:', data.id);

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT - Update recurring job template
    if (method === 'PUT') {
      const { id, ...updates } = body;

      if (!id) {
        throw new Error('id is required for update');
      }

      const { data, error } = await supabase
        .from('recurring_job_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log('[recurring-jobs-crud] Updated template:', id);

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Delete recurring job template
    if (method === 'DELETE') {
      const { id } = body;

      if (!id) {
        throw new Error('id is required for delete');
      }

      const { error } = await supabase
        .from('recurring_job_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('[recurring-jobs-crud] Deleted template:', id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Method not allowed');

  } catch (error) {
    console.error('[recurring-jobs-crud] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
