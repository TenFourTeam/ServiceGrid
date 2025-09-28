import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ok = (data: unknown, status = 200) => json(data, { status });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[leave-business] ${req.method} request received`);

    if (req.method !== 'DELETE') {
      return ok({ error: 'Method not allowed' }, 405);
    }

    const ctx = await requireCtx(req);
    console.log('[leave-business] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify business exists and get owner info
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', ctx.businessId)
      .single();

    if (businessError || !business) {
      console.error('[leave-business] Error fetching business:', businessError);
      return ok({ error: 'Business not found' }, 404);
    }

    // Prevent owners from leaving their own business
    if (business.owner_id === ctx.userId) {
      return ok({ error: 'Business owners cannot leave their business' }, 400);
    }

    // Verify user is actually a member (worker) of this business
    const { data: membershipRow, error: membershipError } = await supabase
      .from('business_permissions')
      .select('user_id')
      .eq('business_id', ctx.businessId)
      .eq('user_id', ctx.userId)
      .maybeSingle();

    if (membershipError) {
      console.error('[leave-business] Error checking membership:', membershipError);
      return ok({ error: 'Failed to verify membership' }, 500);
    }

    if (!membershipRow) {
      return ok({ error: 'You are not a member of this business' }, 403);
    }

    // Remove the user's membership
    const { error: deleteError } = await supabase
      .from('business_permissions')
      .delete()
      .eq('business_id', ctx.businessId)
      .eq('user_id', ctx.userId);

    if (deleteError) {
      console.error('[leave-business] Error removing business permission:', deleteError);
      return ok({ error: 'Failed to leave business' }, 500);
    }

    console.log('[leave-business] User left business successfully:', ctx.userId);
    return ok({ message: 'Left business successfully' });

  } catch (error: any) {
    console.error('[leave-business] Error:', error);
    return ok({ error: error.message || 'Failed to process request' }, 500);
  }
});