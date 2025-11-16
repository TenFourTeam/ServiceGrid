import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);

    const { data, error } = await ctx.supaAdmin
      .from('sg_ai_artifacts')
      .select('*')
      .eq('business_id', ctx.businessId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return json({ artifacts: data || [] });
  } catch (error: any) {
    console.error('[artifacts-list] Error:', error);
    return json(
      { error: error.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});
