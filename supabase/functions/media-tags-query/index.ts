import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { requireCtx, json, corsHeaders } from '../_lib/auth.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { businessId } = ctx;
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    if (req.method !== 'GET') {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Fetch unique tags from media for this business
    const { data, error } = await supabase
      .from('sg_media')
      .select('tags')
      .eq('business_id', businessId)
      .not('tags', 'is', null);

    if (error) throw error;

    // Extract unique tags
    const allTags = new Set<string>();
    data?.forEach(item => {
      const tags = item.tags as string[] | null;
      if (tags && Array.isArray(tags)) {
        tags.forEach(tag => allTags.add(tag));
      }
    });

    return json(Array.from(allTags).sort());
  } catch (error) {
    console.error('[media-tags-query] Error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('Unauthorized') ? 401 : 500 }
    );
  }
});
