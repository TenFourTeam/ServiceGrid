import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";
import { z } from 'https://deno.land/x/zod@v3.20.2/mod.ts';

const SwitchBusinessSchema = z.object({
  businessId: z.string().uuid('Business ID must be a valid UUID'),
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    console.log('[switch-business] POST request received');
    
    // Get authenticated context
    const { userId, supaAdmin } = await requireCtx(req);
    console.log(`[switch-business] Context resolved: userId=${userId}`);

    // Parse and validate request body
    let input;
    const body = await req.text();
    console.log('[switch-business] Raw request body:', body);
    
    try {
      const parsedBody = JSON.parse(body);
      input = SwitchBusinessSchema.parse(parsedBody);
      console.log('[switch-business] Validated input:', { businessId: input.businessId });
    } catch (parseError) {
      console.error('[switch-business] Parsing/validation failed:', parseError);
      return json({ error: 'Invalid request data', details: (parseError as any)?.message || 'Parse error' }, { status: 400 });
    }

    const { businessId } = input;

    // Check if user is a member of the target business
    const { data: membership, error: membershipError } = await supaAdmin
      .from('business_members')
      .select('role, business_id')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .single();

    if (membershipError || !membership) {
      console.error('[switch-business] User is not a member of target business:', membershipError);
      return json({ error: 'You are not a member of this business' }, { status: 403 });
    }

    console.log('[switch-business] User membership verified:', { role: membership.role });

    // Get business name for logging
    const { data: business } = await supaAdmin
      .from('businesses')
      .select('name')
      .eq('id', businessId)
      .single();

    // Update user's default business
    const { error: updateError } = await supaAdmin
      .from('profiles')
      .update({ 
        default_business_id: businessId,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[switch-business] Failed to update default business:', updateError);
      return json({ error: 'Failed to switch business' }, { status: 500 });
    }

    // Log audit action
    await supaAdmin.rpc('log_audit_action', {
      p_business_id: businessId,
      p_user_id: userId,
      p_action: 'business_switched',
      p_resource_type: 'profile',
      p_resource_id: userId,
      p_details: { 
        business_name: business?.name,
        switched_to_business_id: businessId
      }
    });

    console.log(`✅ User successfully switched to business ${business?.name || businessId}`);

    return json({
      success: true,
      message: 'Successfully switched business',
      businessId: businessId
    });

  } catch (error) {
    console.error('[switch-business] Unexpected error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});