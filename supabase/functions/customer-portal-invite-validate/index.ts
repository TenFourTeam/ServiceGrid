import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const url = new URL(req.url);

  try {
    // GET /customer-portal-invite-validate?token=xxx
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Token is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Validating invite token:', token);

    // Find invite by token
    const { data: invite, error: inviteError } = await supabase
      .from('customer_portal_invites')
      .select('*, customers(id, name, email), businesses(id, name, logo_url)')
      .eq('invite_token', token)
      .single();

    if (inviteError || !invite) {
      console.log('Invite not found:', inviteError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid invite link' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already accepted
    if (invite.accepted_at) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'This invite has already been used',
          email: invite.email,
          businessName: (invite.businesses as any)?.name || 'Unknown Business',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if expired
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'This invite has expired',
          email: invite.email,
          businessName: (invite.businesses as any)?.name || 'Unknown Business',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Invite is valid
    return new Response(
      JSON.stringify({
        valid: true,
        email: invite.email,
        customerName: (invite.customers as any)?.name || 'Customer',
        businessName: (invite.businesses as any)?.name || 'Your Service Provider',
        businessLogo: (invite.businesses as any)?.logo_url,
        inviteToken: token,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Invite validation error:', error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
