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
    console.log('[add-team-member] Request received');

    const ctx = await requireCtx(req);
    console.log('[add-team-member] Context resolved:', { userId: ctx.userId, businessId: ctx.businessId });

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (req.method === 'POST') {
      const body = await req.json();
      const { targetUserId, businessId, role = 'worker' } = body;

      if (!targetUserId || !businessId) {
        return ok({ error: 'targetUserId and businessId are required' }, 400);
      }

      if (!['worker', 'owner'].includes(role)) {
        return ok({ error: 'Role must be either worker or owner' }, 400);
      }

      console.log('[add-team-member] Adding member:', { targetUserId, businessId, role });

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
        return ok({ error: 'Only business owners can add team members' }, 403);
      }

      // Get target user profile
      const { data: targetProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', targetUserId)
        .single();

      if (profileError || !targetProfile) {
        return ok({ error: 'Target user not found' }, 404);
      }

      // Check if user is already a member
      const isOwner = business.owner_id === targetUserId;
      if (isOwner) {
        return ok({ error: 'User is already the business owner' }, 400);
      }

      const { data: existingPermission } = await supabase
        .from('business_permissions')
        .select('user_id')
        .eq('business_id', businessId)
        .eq('user_id', targetUserId)
        .maybeSingle();

      if (existingPermission) {
        return ok({ error: 'User is already a member of this business' }, 400);
      }

      // Add business permission
      const { error: insertError } = await supabase
        .from('business_permissions')
        .insert({
          user_id: targetUserId,
          business_id: businessId,
          granted_by: ctx.userId
        });

      if (insertError) {
        console.error('[add-team-member] Error adding business permission:', insertError);
        return ok({ error: 'Failed to add team member' }, 500);
      }

      // Log audit event
      try {
        await supabase.from('audit_logs').insert({
          business_id: businessId,
          user_id: ctx.userId,
          action: 'member.added',
          resource_type: 'business_member',
          resource_id: targetUserId,
          details: { 
            email: targetProfile.email, 
            name: targetProfile.full_name,
            role: 'worker'
          }
        });
      } catch (auditError) {
        console.warn('[add-team-member] Failed to log audit event:', auditError);
      }

      console.log('[add-team-member] Member added successfully:', targetUserId);
      
      return ok({
        message: 'Team member added successfully',
        member: {
          id: targetUserId,
          email: targetProfile.email,
          name: targetProfile.full_name,
          role: 'worker',
          joined_at: new Date().toISOString(),
          joined_via_invite: false
        }
      });
    }

    return ok({ error: 'Method not allowed' }, 405);

  } catch (error: any) {
    console.error('[add-team-member] Error:', error);
    return ok({ error: error.message || 'Failed to process request' }, 500);
  }
});