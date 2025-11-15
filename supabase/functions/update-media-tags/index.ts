import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { mediaId, tags } = await req.json();

    if (!mediaId || !Array.isArray(tags)) {
      return json({ error: 'mediaId and tags array required' }, { status: 400 });
    }

    // Update media tags
    const { data, error } = await ctx.supaAdmin
      .from('sg_media')
      .update({ tags })
      .eq('id', mediaId)
      .eq('business_id', ctx.businessId)
      .select()
      .single();

    if (error) throw error;

    // Auto-create tag vocabulary entries
    for (const tag of tags) {
      await ctx.supaAdmin
        .from('sg_media_tags')
        .upsert({
          business_id: ctx.businessId,
          tag_name: tag
        }, { onConflict: 'business_id,tag_name' });
    }

    return json({ media: data });
  } catch (error: any) {
    console.error('[update-media-tags] Error:', error);
    return json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});
