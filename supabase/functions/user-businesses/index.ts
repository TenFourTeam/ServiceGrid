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
      .select('id, name, logo_url, light_logo_url, description, phone, reply_to_email, tax_rate_default, created_at')
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
        light_logo_url: ownedBusiness.light_logo_url,
        description: ownedBusiness.description,
        phone: ownedBusiness.phone,
        reply_to_email: ownedBusiness.reply_to_email,
        tax_rate_default: ownedBusiness.tax_rate_default,
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
        businesses!business_permissions_business_id_fkey(id, name, logo_url, light_logo_url, description, phone, reply_to_email, tax_rate_default)
      `)
      .eq('user_id', ctx.userId);

    if (workerError) {
      console.error('Worker businesses query error:', workerError);
      return json({ error: 'Failed to fetch worker businesses' }, { status: 500 });
    }

    // Add worker businesses (excluding any we already added as owner)
    const ownedIds = new Set(businesses.map(b => b.id));
    console.log('[user-businesses] Owned IDs for deduplication:', Array.from(ownedIds));
    
    if (workerBusinesses) {
      for (const permission of workerBusinesses) {
        const business = permission.businesses as any;
        
        // Skip if no business data
        if (!business || !business.id) {
          console.log('[user-businesses] Skipping permission with no business data');
          continue;
        }
        
        // Skip if already added as owner (prevents duplicates)
        if (ownedIds.has(business.id)) {
          console.log('[user-businesses] Skipping duplicate business (user is owner):', business.id);
          continue;
        }
        
        businesses.push({
          id: business.id,
          name: business.name,
          logo_url: business.logo_url,
          light_logo_url: business.light_logo_url,
          description: business.description,
          phone: business.phone,
          reply_to_email: business.reply_to_email,
          tax_rate_default: business.tax_rate_default,
          role: 'worker', // Always worker for external businesses
          joined_at: permission.granted_at,
          is_current: false // External memberships are not current
        });
      }
    }

    console.log(`✅ Found ${businesses.length} businesses for user (deduplicated)`);
    
    return json({
      data: businesses,
      count: businesses.length
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in user-businesses:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});