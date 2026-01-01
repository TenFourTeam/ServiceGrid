import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireCtx, json, corsHeaders } from '../_lib/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { businessId, userId } = ctx;
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const url = new URL(req.url);
    const activityType = url.searchParams.get('activityType');
    const limit = parseInt(url.searchParams.get('limit') || '500');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const action = url.searchParams.get('action');

    // GET - List activity logs
    if (req.method === 'GET') {
      // Special action: count pending suggestions
      if (action === 'pending-count') {
        const { data, error } = await supabase
          .from('ai_activity_log')
          .select('id', { count: 'exact' })
          .eq('business_id', businessId)
          .in('activity_type', ['suggestion', 'optimization'])
          .is('accepted', null);

        if (error) throw error;
        return json({ count: data?.length || 0 });
      }

      // Special action: daily digest
      if (action === 'daily-digest') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data, error } = await supabase
          .from('ai_activity_log')
          .select('*')
          .eq('business_id', businessId)
          .gte('created_at', today.toISOString())
          .order('created_at', { ascending: false });

        if (error) throw error;

        const activities = data || [];
        const digest = {
          totalActivities: activities.length,
          suggestions: activities.filter(a => a.activity_type === 'suggestion').length,
          optimizations: activities.filter(a => a.activity_type === 'optimization').length,
          automations: activities.filter(a => a.activity_type === 'automation').length,
          analyses: activities.filter(a => a.activity_type === 'analysis').length,
          accepted: activities.filter(a => a.accepted === true).length,
          rejected: activities.filter(a => a.accepted === false).length,
          pending: activities.filter(a => a.accepted === null).length,
        };

        return json(digest);
      }

      let query = supabase
        .from('ai_activity_log')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (activityType) {
        query = query.eq('activity_type', activityType);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return json(data || []);
    }

    // POST - Create activity log
    if (req.method === 'POST') {
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('ai_activity_log')
        .insert({
          business_id: businessId,
          user_id: userId,
          activity_type: body.activity_type,
          description: body.description,
          metadata: body.metadata || {},
          accepted: body.accepted,
        })
        .select()
        .single();

      if (error) throw error;
      return json(data, { status: 201 });
    }

    // PATCH - Update activity (accept/reject)
    if (req.method === 'PATCH') {
      const activityId = url.searchParams.get('id');
      if (!activityId) {
        return json({ error: 'Activity ID required' }, { status: 400 });
      }

      const body = await req.json();
      
      const { data, error } = await supabase
        .from('ai_activity_log')
        .update({ accepted: body.accepted })
        .eq('id', activityId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (error) throw error;
      return json(data);
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('[ai-activity-crud] Error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
});
