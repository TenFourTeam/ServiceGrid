import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const ctx = await requireCtx(req);
    console.log('[user-businesses] Fetching businesses for user:', ctx.userId);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const businesses = [];

    // Get businesses owned by the user
    const { data: ownedBusinesses, error: ownedError } = await supabase
      .from('businesses')
      .select('id, name, logo_url, created_at')
      .eq('owner_id', ctx.userId);

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

    // 2. Get businesses the user has worker permissions for
    const { data: workerBusinesses, error: workerError } = await supabase
      .from('business_permissions')
      .select(`
        granted_at,
        businesses!business_permissions_business_id_fkey(id, name, logo_url)
      `)
      .eq('user_id', ctx.userId);

    if (workerError) {
      console.error('Worker businesses query error:', workerError);
      return json({ error: 'Failed to fetch worker businesses' }, { status: 500 });
    }

    // Add worker businesses
    if (workerBusinesses) {
      for (const permission of workerBusinesses) {
        const business = permission.businesses as any;
        businesses.push({
          id: business.id,
          name: business.name,
          logo_url: business.logo_url,
          role: 'worker', // Always worker for external businesses
          joined_at: permission.granted_at,
          is_current: false // External memberships are not current
        });
      }
    }

    console.log(`✅ Found ${businesses.length} businesses for user`);
    
    return json(businesses, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in user-businesses:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});