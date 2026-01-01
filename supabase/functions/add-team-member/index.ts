import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ok = (data: unknown, status = 200) => json(data, { status });

/**
 * Add an existing user as a team member to a business
 * 
 * POST /add-team-member
 * Body: { targetUserId: string, businessId?: string, role?: 'worker' | 'owner' }
 * 
 * Returns:
 * - message: string
 * - member: { id, email, name, role, joined_at, joined_via_invite }
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return ok({ error: 'Method not allowed' }, 405);
  }

  try {
    console.log('[add-team-member] Request received');
    
    // Require authenticated context
    const ctx = await requireCtx(req);
    console.log('[add-team-member] Context:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    let body: { targetUserId?: string; businessId?: string; role?: string };
    try {
      body = await req.json();
    } catch (e) {
      return ok({ error: 'Invalid JSON body' }, 400);
    }

    const { targetUserId, businessId, role = 'worker' } = body;
    
    if (!targetUserId) {
      return ok({ error: 'targetUserId is required' }, 400);
    }

    // Validate role
    if (role !== 'worker' && role !== 'owner') {
      return ok({ error: 'Role must be either "worker" or "owner"' }, 400);
    }

    const targetBusinessId = businessId || ctx.businessId;
    
    console.log('[add-team-member] Adding user:', targetUserId, 'to business:', targetBusinessId, 'as:', role);

    // Verify caller has permission (must be owner of the target business)
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('owner_id, name')
      .eq('id', targetBusinessId)
      .single();

    if (businessError || !business) {
      console.error('[add-team-member] Business not found:', businessError);
      return ok({ error: 'Business not found' }, 404);
    }

    if (business.owner_id !== ctx.userId) {
      console.log('[add-team-member] Caller is not owner');
      return ok({ error: 'Only business owners can add team members' }, 403);
    }

    // Verify target user exists
    const { data: targetProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', targetUserId)
      .single();

    if (profileError || !targetProfile) {
      console.error('[add-team-member] Target user not found:', profileError);
      return ok({ error: 'User not found' }, 404);
    }

    // Check if user is already the owner
    if (targetUserId === business.owner_id) {
      return ok({ error: 'User is already the business owner' }, 400);
    }

    // Check if user is already a member
    const { data: existingPermission, error: permCheckError } = await supabase
      .from('business_permissions')
      .select('id')
      .eq('business_id', targetBusinessId)
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (permCheckError) {
      console.error('[add-team-member] Error checking existing permission:', permCheckError);
      return ok({ error: 'Failed to check existing membership' }, 500);
    }

    if (existingPermission) {
      console.log('[add-team-member] User is already a member');
      return ok({ error: 'User is already a team member' }, 400);
    }

    // Add user to business_permissions
    const { data: newPermission, error: insertError } = await supabase
      .from('business_permissions')
      .insert({
        business_id: targetBusinessId,
        user_id: targetUserId,
        granted_by: ctx.userId,
        granted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('[add-team-member] Error adding permission:', insertError);
      return ok({ error: 'Failed to add team member' }, 500);
    }

    console.log('[add-team-member] Member added successfully');

    return ok({
      message: 'Team member added successfully',
      member: {
        id: targetProfile.id,
        email: targetProfile.email,
        name: targetProfile.full_name,
        role: 'worker', // Currently all added members are workers
        joined_at: newPermission.granted_at,
        joined_via_invite: false // Direct add, not via invite
      }
    });

  } catch (error: any) {
    console.error('[add-team-member] Error:', error);
    return ok({ error: error.message || 'Failed to add team member' }, 500);
  }
});
