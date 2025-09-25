import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const ctx = await requireCtx(req);
    const { businessId, action } = await req.json();

    if (!businessId || !action) {
      return json({ error: 'Business ID and action are required' }, { status: 400 });
    }

    if (!['accept', 'reject'].includes(action)) {
      return json({ error: 'Action must be "accept" or "reject"' }, { status: 400 });
    }

    console.log(`📋 User ${ctx.userId} ${action}ing membership for business ${businessId}`);

    // Check if there's a pending membership for this user and business
    const { data: pendingMembership, error: membershipError } = await ctx.supaAdmin
      .from('business_members')
      .select('*')
      .eq('business_id', businessId)
      .eq('user_id', ctx.userId)
      .is('joined_at', null)
      .single();

    if (membershipError || !pendingMembership) {
      return json({ error: 'No pending membership found' }, { status: 404 });
    }

    // Get business details for response
    const { data: business, error: businessError } = await ctx.supaAdmin
      .from('businesses')
      .select('id, name')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return json({ error: 'Business not found' }, { status: 404 });
    }

    if (action === 'accept') {
      // Accept the membership by setting joined_at
      const { error: acceptError } = await ctx.supaAdmin
        .from('business_members')
        .update({
          joined_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', pendingMembership.id);

      if (acceptError) {
        console.error('Failed to accept membership:', acceptError);
        return json({ error: 'Failed to accept membership' }, { status: 500 });
      }

      // Update user's default business if they don't have one
      const { error: profileError } = await ctx.supaAdmin
        .from('profiles')
        .update({ default_business_id: businessId })
        .eq('id', ctx.userId)
        .is('default_business_id', null);

      if (profileError) {
        console.warn('Could not update default business:', profileError);
      }

      // Log audit action
      await ctx.supaAdmin.rpc('log_audit_action', {
        p_business_id: businessId,
        p_user_id: ctx.userId,
        p_action: 'membership_accepted',
        p_resource_type: 'business_member',
        p_resource_id: pendingMembership.id,
        p_details: { business_name: business.name }
      });

      console.log(`✅ User ${ctx.userId} accepted membership to business ${business.name}`);
      return json({ 
        message: 'Membership accepted successfully',
        businessName: business.name
      });
    } else {
      // Reject the membership by deleting the record
      const { error: rejectError } = await ctx.supaAdmin
        .from('business_members')
        .delete()
        .eq('id', pendingMembership.id);

      if (rejectError) {
        console.error('Failed to reject membership:', rejectError);
        return json({ error: 'Failed to reject membership' }, { status: 500 });
      }

      // Log audit action
      await ctx.supaAdmin.rpc('log_audit_action', {
        p_business_id: businessId,
        p_user_id: ctx.userId,
        p_action: 'membership_rejected',
        p_resource_type: 'business_member',
        p_resource_id: pendingMembership.id,
        p_details: { business_name: business.name }
      });

      console.log(`❌ User ${ctx.userId} rejected membership to business ${business.name}`);
      return json({ 
        message: 'Membership rejected successfully',
        businessName: business.name
      });
    }

  } catch (error) {
    console.error('Error in respond-to-membership:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});