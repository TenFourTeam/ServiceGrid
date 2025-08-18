import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const { userId, supaAdmin } = await requireCtx(req);

    console.log(`🏢 Fetching businesses for user: ${userId}`);

    // Get user's profile to know their current default business
    const { data: profile } = await supaAdmin
      .from('profiles')
      .select('default_business_id')
      .eq('id', userId)
      .single();

    // Get all businesses the user is a member of
    const { data: memberships, error: membershipError } = await supaAdmin
      .from('business_members')
      .select(`
        business_id,
        role,
        joined_at,
        businesses:business_id (
          id,
          name,
          logo_url
        )
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });

    if (membershipError) {
      console.error('Error fetching user businesses:', membershipError);
      return json({ error: 'Failed to fetch businesses' }, { status: 500 });
    }

    // Transform data
    const businesses = memberships.map(membership => ({
      id: membership.businesses.id,
      name: membership.businesses.name,
      logo_url: membership.businesses.logo_url,
      role: membership.role,
      joined_at: membership.joined_at,
      is_current: membership.business_id === profile?.default_business_id
    }));

    console.log(`✅ Found ${businesses.length} businesses for user`);

    return json(businesses);

  } catch (error) {
    console.error('Error in user-businesses:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});