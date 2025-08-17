import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[get-business] Request received');
    
    const ctx = await requireCtx(req);
    console.log('[get-business] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get business data with user's role
    const { data: businessData, error: businessError } = await supabase
      .from('businesses')
      .select(`
        id, name, phone, reply_to_email, tax_rate_default, 
        logo_url, light_logo_url,
        business_members!inner(role)
      `)
      .eq('id', ctx.businessId)
      .eq('business_members.user_id', ctx.userId)
      .maybeSingle();

    if (businessError) {
      console.error('[get-business] Business error:', businessError);
      throw new Error(`Failed to fetch business: ${businessError.message}`);
    }

    if (!businessData) {
      console.warn('[get-business] Business not found or user not a member');
      return json({ business: null });
    }

    console.log('[get-business] Business fetched successfully');
    
    return json({
      business: {
        id: businessData.id,
        name: businessData.name,
        phone: businessData.phone,
        replyToEmail: businessData.reply_to_email,
        taxRateDefault: businessData.tax_rate_default,
        logoUrl: businessData.logo_url,
        lightLogoUrl: businessData.light_logo_url,
        role: businessData.business_members[0]?.role || 'worker'
      }
    });

  } catch (error: any) {
    console.error('[get-business] Error:', error);
    
    // Handle auth errors specifically
    if (error.message?.includes('Authentication failed') || error.message?.includes('Missing authentication')) {
      return json({ error: error.message || 'Authentication failed' }, { status: 401 });
    }
    
    return json(
      { error: error.message || 'Failed to get business' },
      { status: 500 }
    );
  }
});