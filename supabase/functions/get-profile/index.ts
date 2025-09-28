import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 [get-profile] === REQUEST START ===');
    
    const startAuth = Date.now();
    const ctx = await requireCtx(req);
    const endAuth = Date.now();
    console.log('🚀 [get-profile] Auth completed in', endAuth - startAuth, 'ms');
    console.log('🚀 [get-profile] Using service role client with manual access control');
    
    console.log('[get-profile] Context resolved:', { userId: ctx.userId, email: ctx.email });

    // Use service role client for all queries
    const supabase = ctx.supaAdmin;

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
      console.warn('[get-profile] Profile not found, this should have been auto-created by requireCtx');
      throw new Error('Profile not found after authentication context resolution');
    }

    console.log('[get-profile] Profile fetched successfully');

    // Always fetch the user's primary business (owned business) only
    let business = null;
    if (profile.default_business_id) {
      console.log('[get-profile] Fetching primary business for:', profile.default_business_id);
      
      // Verify this is actually owned by the user
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
          created_at
        `)
        .eq('id', profile.default_business_id)
        .eq('owner_id', ctx.userId)
        .maybeSingle();

      if (businessError) {
        console.error('[get-profile] Error fetching primary business:', businessError);
      } else if (businessData) {
        business = {
          id: businessData.id,
          name: businessData.name,
          description: businessData.description,
          phone: businessData.phone,
          replyToEmail: businessData.reply_to_email,
          taxRateDefault: businessData.tax_rate_default,
          logoUrl: businessData.logo_url,
          lightLogoUrl: businessData.light_logo_url,
          createdAt: businessData.created_at,
          role: 'owner' // Always owner for primary business
        };

        console.log('[get-profile] Primary business fetched successfully');
      } else {
        console.warn('[get-profile] Default business ID set but business not owned by user');
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