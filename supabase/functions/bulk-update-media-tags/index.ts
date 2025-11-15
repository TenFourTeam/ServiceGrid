import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { mediaIds, tags } = await req.json();

    if (!Array.isArray(mediaIds) || !Array.isArray(tags)) {
      return json({ error: 'mediaIds and tags arrays required' }, { status: 400 });
    }

    // Update all media items
    const { data, error } = await ctx.supaAdmin
      .from('sg_media')
      .update({ tags })
      .in('id', mediaIds)
      .eq('business_id', ctx.businessId)
      .select();

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

    return json({ updated: data?.length || 0 });
  } catch (error: any) {
    console.error('[bulk-update-media-tags] Error:', error);
    return json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});
