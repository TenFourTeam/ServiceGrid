import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const supabase = ctx.supaAdmin;
    const url = new URL(req.url);
    const pageId = url.searchParams.get('pageId');

    if (!pageId) throw new Error('pageId required');

    if (req.method === 'POST') {
      const body = await req.json();

      await supabase
        .from('sg_page_collaborators')
        .upsert({
          page_id: pageId,
          user_id: ctx.userId,
          cursor_position: body.cursorPosition || null,
          is_viewing: body.isViewing ?? true,
          last_viewed_at: new Date().toISOString(),
        });

      return json({ success: true });
    }

    // GET: Get active collaborators
    if (req.method === 'GET') {
      const { data: collaborators, error } = await supabase
        .from('sg_page_collaborators')
        .select(`
          *,
          profile:profiles(id, full_name)
        `)
        .eq('page_id', pageId)
        .eq('is_viewing', true)
        .gte('last_viewed_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

      if (error) throw error;

      return json({ collaborators });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error: any) {
    console.error('[page-presence] Error:', error);
    return json({ error: error.message }, { status: 500 });
  }
});