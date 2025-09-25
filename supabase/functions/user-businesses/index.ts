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

    // Get businesses where user is an explicit member (only accepted memberships)
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
      .not('joined_at', 'is', null)
      .order('joined_at', { ascending: false });

    if (membershipError) {
      console.error('Error fetching user business memberships:', membershipError);
      return json({ error: 'Failed to fetch business memberships' }, { status: 500 });
    }

    // Get businesses where user is the owner - match with profile ID
    const { data: ownedBusinesses, error: ownedError } = await supaAdmin
      .from('businesses')
      .select(`
        id,
        name,
        logo_url,
        created_at
      `)
      .eq('owner_id', userId)  // Use userId (profile ID) instead of auth.uid()
      .order('created_at', { ascending: false });

    if (ownedError) {
      console.error('Error fetching owned businesses:', ownedError);
      return json({ error: 'Failed to fetch owned businesses' }, { status: 500 });
    }

    // Transform explicit memberships
    const membershipBusinesses = memberships.map((membership: any) => ({
      id: membership.businesses.id,
      name: membership.businesses.name,
      logo_url: membership.businesses.logo_url,
      role: membership.role,
      joined_at: membership.joined_at,
      is_current: membership.business_id === profile?.default_business_id
    }));

    // Transform owned businesses
    const ownerBusinesses = ownedBusinesses.map((business: any) => ({
      id: business.id,
      name: business.name,
      logo_url: business.logo_url,
      role: 'owner' as const,
      joined_at: business.created_at, // Use creation date as joined date for owners
      is_current: business.id === profile?.default_business_id
    }));

    // Combine and deduplicate (prioritize owner role if user is both owner and member)
    const businessMap = new Map();
    
    // Add memberships first
    membershipBusinesses.forEach((business: any) => {
      businessMap.set(business.id, business);
    });
    
    // Add owned businesses (will override if duplicate, ensuring owner role takes priority)
    ownerBusinesses.forEach((business: any) => {
      businessMap.set(business.id, business);
    });

    const businesses = Array.from(businessMap.values());

    console.log(`✅ Found ${businesses.length} businesses for user`);

    return json(businesses);

  } catch (error) {
    console.error('Error in user-businesses:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});