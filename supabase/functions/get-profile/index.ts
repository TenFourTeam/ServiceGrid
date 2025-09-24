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
    const ctx = await requireCtxWithUserClient(req, { autoCreate: false });
    const endAuth = Date.now();
    console.log('🚀 [get-profile] Auth completed in', endAuth - startAuth, 'ms');
    console.log('🚀 [get-profile] Using user-scoped client for RLS queries');
    
    // Parse query parameters to get business context
    const url = new URL(req.url);
    const requestedBusinessId = url.searchParams.get('businessId');
    console.log('[get-profile] Context resolved:', { 
      userId: ctx.userId, 
      email: ctx.email, 
      businessId: ctx.businessId,
      requestedBusinessId 
    });

    // Use user-scoped client instead of service role for RLS
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

    // For Clerk organizations, use the organization ID from context as business ID
    const targetBusinessId = ctx.businessId || requestedBusinessId || profile.default_business_id;
    
    let business = null;
    if (targetBusinessId) {
      console.log('[get-profile] Using business ID from context (Clerk org):', targetBusinessId);
      
      // Create a business object from the organization context
      // Since we're using Clerk organizations, we don't need to check membership in database
      // The organization data will be merged in the frontend from Clerk
      business = {
        id: targetBusinessId,
        name: 'Organization', // This will be overridden by Clerk organization data
        role: 'owner' // Default role, will be determined by Clerk membership
      };

      // Optionally, try to fetch additional business data from database if it exists
      try {
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
            light_logo_url
          `)
          .eq('id', targetBusinessId)
          .maybeSingle();

        if (!businessError && businessData) {
          console.log('[get-profile] Found additional business data in database');
          business = {
            ...business,
            name: businessData.name,
            description: businessData.description,
            phone: businessData.phone,
            replyToEmail: businessData.reply_to_email,
            taxRateDefault: businessData.tax_rate_default,
            logoUrl: businessData.logo_url,
            lightLogoUrl: businessData.light_logo_url,
          };
        } else {
          console.log('[get-profile] No additional business data found in database, using Clerk org data');
        }
      } catch (dbError) {
        console.warn('[get-profile] Failed to fetch business data from database:', dbError);
        // Continue with basic business object
      }

      console.log('[get-profile] Business context resolved successfully');
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