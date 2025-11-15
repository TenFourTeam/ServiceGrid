import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { mediaId, annotations } = await req.json();

    if (!mediaId || !Array.isArray(annotations)) {
      return json({ error: 'mediaId and annotations array required' }, { status: 400 });
    }

    // Update media annotations
    const { data, error } = await ctx.supaAdmin
      .from('sg_media')
      .update({ 
        annotations,
        has_annotations: annotations.length > 0
      })
      .eq('id', mediaId)
      .eq('business_id', ctx.businessId)
      .select()
      .single();

    if (error) throw error;

    return json({ media: data });
  } catch (error: any) {
    console.error('[update-media-annotations] Error:', error);
    return json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});
