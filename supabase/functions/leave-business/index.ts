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
    const { userId, supaAdmin } = await requireCtx(req);
    const { businessId } = await req.json();

    if (!businessId) {
      return json({ error: 'Business ID is required' }, { status: 400 });
    }

    console.log(`🚪 User ${userId} leaving business ${businessId}`);

    // Check if user is a member of this business
    const { data: membership, error: membershipError } = await supaAdmin
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      return json({ error: 'You are not a member of this business' }, { status: 404 });
    }

    // Prevent owners from leaving their own business
    if (membership.role === 'owner') {
      return json({ error: 'Business owners cannot leave their own business' }, { status: 400 });
    }

    // Get business name for logging
    const { data: business } = await supaAdmin
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single();

    // Remove user from business members
    const { error: deleteError } = await supaAdmin
      .from('business_members')
      .delete()
      .eq('business_id', businessId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Failed to remove business membership:', deleteError);
      return json({ error: 'Failed to leave business' }, { status: 500 });
    }

    // Update user's default business if this was their default
    const { data: profile } = await supaAdmin
      .from('profiles')
      .select('default_business_id')
      .eq('id', userId)
      .single();

    if (profile?.default_business_id === businessId) {
      // Find another business the user is a member of to set as default
      const { data: otherMembership } = await supaAdmin
        .from('business_members')
        .select('business_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      await supaAdmin
        .from('profiles')
        .update({ 
          default_business_id: otherMembership?.business_id || null 
        })
        .eq('id', userId);
    }

    // Log audit action
    await supaAdmin.rpc('log_audit_action', {
      p_business_id: businessId,
      p_user_id: userId,
      p_action: 'team_member_left',
      p_resource_type: 'business_member',
      p_resource_id: userId,
      p_details: { 
        business_name: business?.name,
        left_voluntarily: true
      }
    });

    console.log(`✅ User successfully left business ${business?.name || businessId}`);

    return json({
      message: 'Successfully left business'
    });

  } catch (error) {
    console.error('Error in leave-business:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});