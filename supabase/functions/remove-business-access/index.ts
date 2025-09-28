import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Profile lookup failed:', profileError);
      return new Response(
        JSON.stringify({ error: 'Profile not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { businessId } = await req.json();
    if (!businessId) {
      return new Response(
        JSON.stringify({ error: 'businessId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user is not the business owner
    const { data: business, error: businessError } = await supabaseClient
      .from('businesses')
      .select('owner_id, name')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      console.error('Business lookup failed:', businessError);
      return new Response(
        JSON.stringify({ error: 'Business not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (business.owner_id === profile.id) {
      return new Response(
        JSON.stringify({ error: 'Cannot remove access to business you own' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if this is the user's current business
    const { data: userProfile, error: userProfileError } = await supabaseClient
      .from('profiles')
      .select('default_business_id')
      .eq('id', profile.id)
      .single();

    if (userProfileError) {
      console.error('User profile lookup failed:', userProfileError);
      return new Response(
        JSON.stringify({ error: 'Failed to check current business' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (userProfile.default_business_id === businessId) {
      return new Response(
        JSON.stringify({ error: 'Cannot remove access to your current business. Please switch to another business first.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Remove access by revoking the invite
    const { error: revokeError } = await supabaseClient
      .from('invites')
      .update({ 
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('business_id', businessId)
      .eq('redeemed_by', profile.id)
      .is('revoked_at', null);

    if (revokeError) {
      console.error('Failed to revoke invite:', revokeError);
      return new Response(
        JSON.stringify({ error: 'Failed to remove business access' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the action in audit logs
    const { error: auditError } = await supabaseClient
      .from('audit_logs')
      .insert({
        business_id: businessId,
        user_id: profile.id,
        action: 'leave_business',
        resource_type: 'business_access',
        resource_id: businessId,
        details: {
          business_name: business.name,
          user_id: profile.id
        }
      });

    if (auditError) {
      console.warn('Failed to log audit action:', auditError);
    }

    console.log(`User ${profile.id} successfully left business ${businessId}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Successfully left business'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})