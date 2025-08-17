import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const url = new URL(req.url);
    const businessId = url.searchParams.get('business_id');

    if (!businessId) {
      return json({ error: 'business_id is required' }, { status: 400 });
    }

    // Verify user has access to this business
    const { data: membership } = await ctx.supaAdmin
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', ctx.userId)
      .single();

    if (!membership) {
      return json({ error: 'Not authorized' }, { status: 403 });
    }

    if (req.method === 'GET') {
      // Get all members for this business
      const { data: members, error } = await ctx.supaAdmin
        .from('business_members')
        .select(`
          id,
          business_id,
          user_id,
          role,
          invited_at,
          joined_at,
          invited_by,
          profiles!business_members_user_id_fkey(email)
        `)
        .eq('business_id', businessId)
        .order('role', { ascending: false }) // owners first
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error fetching members:', error);
        return json({ error: 'Failed to fetch members' }, { status: 500 });
      }

      const formattedMembers = members?.map(member => ({
        id: member.id,
        business_id: member.business_id,
        user_id: member.user_id,
        role: member.role,
        invited_at: member.invited_at,
        joined_at: member.joined_at,
        invited_by: member.invited_by,
        email: member.profiles?.email,
      })) || [];

      return json({ members: formattedMembers });
    }

    return json({ error: 'Method not allowed' }, { status: 405 });
  } catch (error) {
    console.error('Business members error:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
});