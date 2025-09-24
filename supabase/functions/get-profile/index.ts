import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtxWithUserClient } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 [get-profile] === REQUEST START ===');
    
    const startAuth = Date.now();
    const ctx = await requireCtxWithUserClient(req, { autoCreate: true });
    const endAuth = Date.now();
    console.log('🚀 [get-profile] Auth completed in', endAuth - startAuth, 'ms');
    console.log('🚀 [get-profile] Using user-scoped client for RLS queries');
    
    console.log('[get-profile] Context resolved:', { 
      userId: ctx.userId, 
      email: ctx.email, 
      businessId: ctx.businessId 
    });

    // Use user-scoped client for RLS
    const supabase = ctx.userClient;

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, phone_e164, default_business_id')
      .eq('id', ctx.userId)
      .maybeSingle();

    if (profileError) {
      console.error('[get-profile] Profile error:', profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    if (!profile) {
      console.warn('[get-profile] Profile not found');
      return json({ profile: null, business: null });
    }

    console.log('[get-profile] Profile fetched successfully');

    // Use resolved business ID from auth context
    const targetBusinessId = ctx.businessId;
    
    let business = null;
    if (targetBusinessId) {
      console.log('[get-profile] Fetching business data for ID:', targetBusinessId);
      
      // Fetch business data and determine user role
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select(`
          id,
          name,
          description,
          phone,
          reply_to_email,
          tax_rate_default,
          logo_url,
          light_logo_url,
          owner_id
        `)
        .eq('id', targetBusinessId)
        .maybeSingle();

      if (businessError) {
        console.error('[get-profile] Business error:', businessError);
        throw new Error(`Failed to fetch business: ${businessError.message}`);
      }

      if (businessData) {
        // Determine user role - owner if they own the business, otherwise worker
        const userRole = businessData.owner_id === ctx.userId ? 'owner' : 'worker';
        
        business = {
          id: businessData.id,
          name: businessData.name,
          description: businessData.description,
          phone: businessData.phone,
          replyToEmail: businessData.reply_to_email,
          taxRateDefault: businessData.tax_rate_default,
          logoUrl: businessData.logo_url,
          lightLogoUrl: businessData.light_logo_url,
          role: userRole
        };
        
        console.log('[get-profile] Business data fetched successfully with role:', userRole);
      } else {
        console.log('[get-profile] No business found for ID:', targetBusinessId);
      }
    }
    
    return json({
      profile: {
        id: profile.id,
        fullName: profile.full_name,
        phoneE164: profile.phone_e164,
        defaultBusinessId: profile.default_business_id
      },
      business
    });

  } catch (error: any) {
    console.error('[get-profile] Error:', error);
    
    // Handle auth errors specifically
    if (error.message?.includes('Authentication failed') || error.message?.includes('Missing authentication')) {
      return json({ error: error.message || 'Authentication failed' }, { status: 401 });
    }
    
    // Handle missing profile/business gracefully (when auto-creation is disabled)
    if (error.message?.includes('Profile not found') || error.message?.includes('No business found')) {
      console.info('[get-profile] Profile or business not found, returning null');
      return json({ profile: null, business: null });
    }
    
    return json(
      { error: error.message || 'Failed to get profile' },
      { status: 500 }
    );
  }
});