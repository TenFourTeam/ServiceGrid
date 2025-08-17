import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 [get-profile] === REQUEST START ===');
    console.log('🚀 [get-profile] URL:', req.url);
    console.log('🚀 [get-profile] Method:', req.method);
    console.log('🚀 [get-profile] Headers:', Object.fromEntries(req.headers.entries()));
    console.log('🚀 [get-profile] Request received');
    
    console.log('🚀 [get-profile] Calling requireCtx in read-only mode...');
    const startAuth = Date.now();
    const ctx = await requireCtx(req, { autoCreate: false });
    const endAuth = Date.now();
    console.log('🚀 [get-profile] Auth completed in', endAuth - startAuth, 'ms');
    console.log('[get-profile] Context resolved:', { userId: ctx.userId, email: ctx.email });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    // Fetch business details if user has a default business
    let business = null;
    if (profile.default_business_id) {
      console.log('[get-profile] Fetching business data for:', profile.default_business_id);
      
      // Get business details
      const { data: businessData, error: businessError } = await supabase
        .from('businesses')
        .select(`
          id,
          name,
          phone,
          reply_to_email,
          tax_rate_default,
          logo_url,
          light_logo_url
        `)
        .eq('id', profile.default_business_id)
        .single();

      if (businessError) {
        console.error('[get-profile] Error fetching business:', businessError);
        // Don't throw, just return profile without business
      } else {
        // Get user's role in the business
        const { data: memberData, error: memberError } = await supabase
          .from('business_members')
          .select('role')
          .eq('business_id', profile.default_business_id)
          .eq('user_id', ctx.userId)
          .single();

        if (memberError) {
          console.error('[get-profile] Error fetching member role:', memberError);
          // Don't throw, use business data without role
        }

        business = {
          id: businessData.id,
          name: businessData.name,
          phone: businessData.phone,
          replyToEmail: businessData.reply_to_email,
          taxRateDefault: businessData.tax_rate_default,
          logoUrl: businessData.logo_url,
          lightLogoUrl: businessData.light_logo_url,
          role: memberData?.role || 'owner'
        };

        console.log('[get-profile] Business data fetched successfully');
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