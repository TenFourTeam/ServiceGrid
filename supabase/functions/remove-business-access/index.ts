import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
import { corsHeaders, json, requireCtx } from '../_lib/auth.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 });
    }

    // Get authentication context
    const ctx = await requireCtx(req);
    console.log(`User ${ctx.userId} attempting to remove business access`);

    // Create service role client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Parse request body
    const { businessId } = await req.json();
    if (!businessId) {
      return json({ error: 'businessId is required' }, { status: 400 });
    }

    // Verify the user is not the business owner
    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('owner_id, name')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      console.error('Business lookup failed:', businessError);
      return json({ error: 'Business not found' }, { status: 404 });
    }

    if (business.owner_id === ctx.userId) {
      return json({ error: 'Cannot remove access to business you own' }, { status: 400 });
    }

    // Check if this is the user's current business
    const { data: userProfile, error: userProfileError } = await supabase
      .from('profiles')
      .select('default_business_id')
      .eq('id', ctx.userId)
      .single();

    if (userProfileError) {
      console.error('User profile lookup failed:', userProfileError);
      return json({ error: 'Failed to check current business' }, { status: 500 });
    }

    if (userProfile.default_business_id === businessId) {
      return json({ error: 'Cannot remove access to your current business. Please switch to another business first.' }, { status: 400 });
    }

    // Remove access from business_permissions table
    const { error: removeError } = await supabase
      .from('business_permissions')
      .delete()
      .eq('business_id', businessId)
      .eq('user_id', ctx.userId);

    if (removeError) {
      console.error('Failed to remove business access:', removeError);
      return json({ error: 'Failed to remove business access' }, { status: 500 });
    }

    // Log the action in audit logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        business_id: businessId,
        user_id: ctx.userId,
        action: 'leave_business',
        resource_type: 'business_access',
        resource_id: businessId,
        details: {
          business_name: business.name,
          user_id: ctx.userId
        }
      });

    if (auditError) {
      console.warn('Failed to log audit action:', auditError);
    }

    console.log(`User ${ctx.userId} successfully left business ${businessId}`);

    return json({ 
      success: true,
      message: 'Successfully left business'
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
})