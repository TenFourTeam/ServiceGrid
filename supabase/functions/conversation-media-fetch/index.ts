import { corsHeaders } from '../_shared/cors.ts';
import { requireCtx } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { businessId } = ctx;

    const url = new URL(req.url);
    const mediaIds = url.searchParams.get('mediaIds')?.split(',').filter(Boolean);

    if (!mediaIds || mediaIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No mediaIds provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch media items
    const { data: media, error } = await ctx.supaAdmin
      .from('sg_media')
      .select('*')
      .in('id', mediaIds)
      .eq('business_id', businessId);

    if (error) {
      console.error('Error fetching media:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch media', details: error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ media: media || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Fetch error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
