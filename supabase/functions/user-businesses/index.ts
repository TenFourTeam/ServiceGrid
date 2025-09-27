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

    // Get user email first for invite lookups
    const { data: userProfile, error: profileError } = await supaAdmin
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single();

    if (profileError || !userProfile) {
      console.error('Profile query error:', profileError);
      return json({ error: 'User profile not found' }, { status: 404 });
    }

    const businesses = [];

    // 1. Get primary business (owned business) - single source of truth via businesses.owner_id
    const { data: ownedBusinesses, error: ownedError } = await supaAdmin
      .from('businesses')
      .select('id, name, logo_url, created_at')
      .eq('owner_id', userId);

    if (ownedError) {
      console.error('Owned business query error:', ownedError);
      return json({ error: 'Failed to fetch owned businesses' }, { status: 500 });
    }

    // Add owned businesses (should be exactly one)
    if (ownedBusinesses && ownedBusinesses.length > 0) {
      const ownedBusiness = ownedBusinesses[0]; // Take first (should be only one)
      businesses.push({
        id: ownedBusiness.id,
        name: ownedBusiness.name,
        logo_url: ownedBusiness.logo_url,
        role: 'owner',
        joined_at: ownedBusiness.created_at,
        is_current: true // Primary business is current
      });
    }

    // 2. Get external memberships (worker businesses from accepted invites)
    const { data: acceptedInvites, error: inviteError } = await supaAdmin
      .from('invites')
      .select(`
        business_id,
        accepted_at,
        businesses!inner (
          id,
          name,
          logo_url
        )
      `)
      .eq('email', userProfile.email)
      .not('accepted_at', 'is', null);

    if (inviteError) {
      console.error('Accepted invites query error:', inviteError);
      return json({ error: 'Failed to fetch worker businesses' }, { status: 500 });
    }

    // Add worker businesses from accepted invites
    if (acceptedInvites) {
      for (const invite of acceptedInvites) {
        const business = invite.businesses as any;
        businesses.push({
          id: business.id,
          name: business.name,
          logo_url: business.logo_url,
          role: 'worker', // Always worker for external businesses
          joined_at: invite.accepted_at,
          is_current: false // External memberships are not current
        });
      }
    }

    console.log(`✅ Found ${businesses.length} businesses for user`);
    
    return json(businesses);

  } catch (error) {
    console.error('Error in user-businesses:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});