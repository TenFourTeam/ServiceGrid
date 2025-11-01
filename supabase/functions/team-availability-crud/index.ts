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
      console.error('[team-availability-crud] Auth error:', authError);
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

    console.log(`[team-availability-crud] ${method} request from user ${profile.id}`);

    // GET - List availability for a business/user
    if (method === 'GET') {
      const url = new URL(req.url);
      const businessId = url.searchParams.get('businessId');
      const userId = url.searchParams.get('userId');

      if (!businessId) {
        throw new Error('businessId is required');
      }

      let query = supabase
        .from('team_availability')
        .select('*')
        .eq('business_id', businessId)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // POST - Create availability
    if (method === 'POST') {
      const { business_id, user_id, day_of_week, start_time, end_time, is_available } = body;

      const { data, error } = await supabase
        .from('team_availability')
        .insert({
          business_id,
          user_id,
          day_of_week,
          start_time,
          end_time,
          is_available: is_available ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('[team-availability-crud] Created availability:', data.id);

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // PUT - Update availability
    if (method === 'PUT') {
      const { id, ...updates } = body;

      if (!id) {
        throw new Error('id is required for update');
      }

      const { data, error } = await supabase
        .from('team_availability')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      console.log('[team-availability-crud] Updated availability:', id);

      return new Response(JSON.stringify({ data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE - Delete availability
    if (method === 'DELETE') {
      const { id } = body;

      if (!id) {
        throw new Error('id is required for delete');
      }

      const { error } = await supabase
        .from('team_availability')
        .delete()
        .eq('id', id);

      if (error) throw error;

      console.log('[team-availability-crud] Deleted availability:', id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Method not allowed');

  } catch (error) {
    console.error('[team-availability-crud] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: error.message === 'Unauthorized' ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
