import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ok = (data: unknown, status = 200) => json(data, { status });

/**
 * Check if a user exists by email and whether they're already a member of a business
 * 
 * POST /check-user-exists
 * Body: { email: string, businessId: string }
 * 
 * Returns:
 * - exists: boolean - whether a user with this email exists
 * - alreadyMember: boolean - whether they're already a member of this business
 * - user: { id, email, name } - user info if they exist (for adding as member)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return ok({ error: 'Method not allowed' }, 405);
  }

  try {
    console.log('[check-user-exists] Request received');
    
    // Require authenticated context
    const ctx = await requireCtx(req);
    console.log('[check-user-exists] Context:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let body: { email?: string; businessId?: string };
    try {
      body = await req.json();
    } catch (e) {
      return ok({ error: 'Invalid JSON body' }, 400);
    }

    const { email, businessId } = body;
    
    if (!email) {
      return ok({ error: 'Email is required' }, 400);
    }

    const targetBusinessId = businessId || ctx.businessId;
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log('[check-user-exists] Checking email:', normalizedEmail, 'for business:', targetBusinessId);

    // Verify caller has permission (must be owner of the target business)
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('owner_id')
      .eq('id', targetBusinessId)
      .single();

    if (businessError || !business) {
      console.error('[check-user-exists] Business not found:', businessError);
      return ok({ error: 'Business not found' }, 404);
    }

    if (business.owner_id !== ctx.userId) {
      console.log('[check-user-exists] Caller is not owner');
      return ok({ error: 'Only business owners can check user existence' }, 403);
    }

    // Check if user exists in profiles table by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (profileError) {
      console.error('[check-user-exists] Error querying profiles:', profileError);
      return ok({ error: 'Failed to check user existence' }, 500);
    }

    if (!profile) {
      console.log('[check-user-exists] User does not exist');
      return ok({
        exists: false,
        alreadyMember: false,
        user: null
      });
    }

    console.log('[check-user-exists] User found:', profile.id);

    // Check if user is the owner
    if (profile.id === business.owner_id) {
      console.log('[check-user-exists] User is the business owner');
      return ok({
        exists: true,
        alreadyMember: true,
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.full_name,
          role: 'owner'
        }
      });
    }

    // Check if user is already a member (via business_permissions)
    const { data: permission, error: permissionError } = await supabase
      .from('business_permissions')
      .select('user_id, granted_at')
      .eq('business_id', targetBusinessId)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (permissionError) {
      console.error('[check-user-exists] Error checking permissions:', permissionError);
      return ok({ error: 'Failed to check membership' }, 500);
    }

    const alreadyMember = !!permission;
    console.log('[check-user-exists] Already member:', alreadyMember);

    return ok({
      exists: true,
      alreadyMember,
      user: {
        id: profile.id,
        email: profile.email,
        name: profile.full_name,
        role: alreadyMember ? 'worker' : null
      }
    });

  } catch (error: any) {
    console.error('[check-user-exists] Error:', error);
    return ok({ error: error.message || 'Failed to check user existence' }, 500);
  }
});
