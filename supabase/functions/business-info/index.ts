import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { requireCtx, corsHeaders, json } from '../_lib/auth.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.info('🚀 [business-info] === REQUEST START ===');
    console.info('🚀 [business-info] URL:', req.url);
    console.info('🚀 [business-info] Method:', req.method);
    console.info('🚀 [business-info] Headers:', Object.fromEntries(req.headers.entries()));
    console.info('🚀 [business-info] Starting business info request');
    
    // Get authenticated context with business resolution
    console.info('🚀 [business-info] Calling requireCtx...');
    const startAuth = Date.now();
    const ctx = await requireCtx(req);
    const endAuth = Date.now();
    console.info('🚀 [business-info] Auth completed in', endAuth - startAuth, 'ms');
    console.info('[business-info] Auth context resolved', { 
      userId: ctx.userId, 
      businessId: ctx.businessId 
    });

    // Fetch business details with user's role
    const { data: businessData, error: businessError } = await ctx.supaAdmin
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
      .eq('id', ctx.businessId)
      .single();

    if (businessError) {
      console.error('[business-info] Error fetching business:', businessError);
      return json({ error: 'Failed to fetch business' }, { status: 500 });
    }

    // Fetch user's role in the business
    const { data: memberData, error: memberError } = await ctx.supaAdmin
      .from('business_members')
      .select('role')
      .eq('business_id', ctx.businessId)
      .eq('user_id', ctx.userId)
      .single();

    if (memberError) {
      console.error('[business-info] Error fetching member role:', memberError);
      return json({ error: 'Failed to fetch user role' }, { status: 500 });
    }

    const business = {
      id: businessData.id,
      name: businessData.name,
      phone: businessData.phone,
      replyToEmail: businessData.reply_to_email,
      taxRateDefault: businessData.tax_rate_default,
      logoUrl: businessData.logo_url,
      lightLogoUrl: businessData.light_logo_url,
      role: memberData.role
    };

    console.info('[business-info] Business info retrieved successfully');
    return json({ business });

  } catch (error: any) {
    console.error('[business-info] Unexpected error:', error);
    return json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});