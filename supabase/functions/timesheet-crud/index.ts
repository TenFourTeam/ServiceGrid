import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[timesheet-crud] ${req.method} request received`);
    
    const ctx = await requireCtx(req);
    console.log('[timesheet-crud] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('timesheet_entries')
        .select('*')
        .eq('business_id', ctx.businessId)
        .eq('user_id', ctx.userId)
        .order('clock_in_time', { ascending: false });

      if (error) {
        console.error('[timesheet-crud] GET error:', error);
        throw new Error(`Failed to fetch timesheet entries: ${error.message}`);
      }

      console.log('[timesheet-crud] Fetched', data?.length || 0, 'timesheet entries');
      return json({ entries: data || [] });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { notes } = body;

      const { data, error } = await supabase
        .from('timesheet_entries')
        .insert([{
          business_id: ctx.businessId,
          user_id: ctx.userId,
          notes: notes || null,
        }])
        .select()
        .single();

      if (error) {
        console.error('[timesheet-crud] POST error:', error);
        throw new Error(`Failed to clock in: ${error.message}`);
      }

      console.log('[timesheet-crud] Clocked in:', data.id);
      return json({ entry: data });
    }

    if (req.method === 'PUT') {
      const body = await req.json();
      const { entryId, notes } = body;

      const { data, error } = await supabase
        .from('timesheet_entries')
        .update({
          clock_out_time: new Date().toISOString(),
          notes: notes || null,
        })
        .eq('id', entryId)
        .eq('user_id', ctx.userId)
        .eq('business_id', ctx.businessId)
        .select()
        .single();

      if (error) {
        console.error('[timesheet-crud] PUT error:', error);
        throw new Error(`Failed to clock out: ${error.message}`);
      }

      console.log('[timesheet-crud] Clocked out:', data.id);
      return json({ entry: data });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });

  } catch (error: any) {
    console.error('[timesheet-crud] Error:', error);
    return json(
      { error: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
});