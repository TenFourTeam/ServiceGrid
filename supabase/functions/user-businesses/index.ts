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

    // 2. Get external memberships (worker businesses only from business_members)
    const { data: memberBusinesses, error: memberError } = await supaAdmin
      .from('business_members')
      .select(`
        business_id,
        role,
        joined_at,
        businesses!inner (
          id,
          name,
          logo_url
        )
      `)
      .eq('user_id', userId);

    if (memberError) {
      console.error('Member businesses query error:', memberError);
      return json({ error: 'Failed to fetch worker businesses' }, { status: 500 });
    }

    // Add worker businesses
    if (memberBusinesses) {
      for (const membership of memberBusinesses) {
        const business = membership.businesses as any;
        businesses.push({
          id: business.id,
          name: business.name,
          logo_url: business.logo_url,
          role: membership.role, // Always 'worker' now due to constraint
          joined_at: membership.joined_at,
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