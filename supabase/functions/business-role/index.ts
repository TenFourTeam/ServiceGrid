import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId: ownerId, supaAdmin: supabase } = await requireCtx(req);
    const url = new URL(req.url);
    const businessId = url.searchParams.get('business_id');

    if (!businessId) {
      return json({ error: 'business_id is required' }, { status: 400 });
    }

    if (req.method === 'GET') {
      // Get user's role in this business
      const { data: membership } = await supabase
        .from('business_members')
        .select('role')
        .eq('business_id', businessId)
        .eq('user_id', ownerId)
        .single();

      return json({
        role: membership?.role || null,
        canManage: membership?.role === 'owner',
      });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Business role error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
});