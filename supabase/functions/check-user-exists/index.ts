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
    console.log('[check-user-exists] Request received');

    const ctx = await requireCtx(req);
    console.log('[check-user-exists] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      const body = await req.json();
      const { email, businessId } = body;

      if (!email || !businessId) {
        return ok({ error: 'Email and businessId are required' }, 400);
      }

      console.log('[check-user-exists] Checking user existence for:', email);

      // Verify the requester is the business owner
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('owner_id')
        .eq('id', businessId)
        .single();

      if (businessError || !business) {
        return ok({ error: 'Business not found' }, 404);
      }

      if (business.owner_id !== ctx.userId) {
        return ok({ error: 'Only business owners can check user existence' }, 403);
      }

      // Check if user exists in profiles
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (profileError) {
        console.error('[check-user-exists] Error checking user profile:', profileError);
        return ok({ error: 'Failed to check user existence' }, 500);
      }

      if (!userProfile) {
        return ok({ 
          exists: false, 
          alreadyMember: false 
        });
      }

      // Check if user is already a member of this business
      const isOwner = business.owner_id === userProfile.id;
      
      let isMember = isOwner;
      if (!isOwner) {
        const { data: membershipRow } = await supabase
          .from('business_permissions')
          .select('user_id')
          .eq('business_id', businessId)
          .eq('user_id', userProfile.id)
          .maybeSingle();
        
        isMember = !!membershipRow;
      }

      return ok({
        exists: true,
        alreadyMember: isMember,
        user: {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.full_name,
          role: isOwner ? 'owner' : 'worker'
        }
      });
    }

    return ok({ error: 'Method not allowed' }, 405);

  } catch (error: any) {
    console.error('[check-user-exists] Error:', error);
    return ok({ error: error.message || 'Failed to process request' }, 500);
  }
});