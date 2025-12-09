import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Get authenticated user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user from Clerk JWT via our profile lookup
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    
    // Parse request
    const { customer_id, business_id } = await req.json();

    if (!customer_id || !business_id) {
      return new Response(
        JSON.stringify({ error: 'customer_id and business_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, name, email, business_id, businesses(id, name, logo_url)')
      .eq('id', customer_id)
      .eq('business_id', business_id)
      .single();

    if (customerError || !customer) {
      console.error('Customer not found:', customerError);
      return new Response(
        JSON.stringify({ error: 'Customer not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if there's already an active invite
    const { data: existingInvite } = await supabase
      .from('customer_portal_invites')
      .select('id, expires_at, accepted_at')
      .eq('customer_id', customer_id)
      .eq('business_id', business_id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    let invite;

    if (existingInvite) {
      // Resend existing invite
      invite = existingInvite;
      
      // Update sent_at
      await supabase
        .from('customer_portal_invites')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', existingInvite.id);
    } else {
      // Create new invite
      const { data: newInvite, error: inviteError } = await supabase
        .from('customer_portal_invites')
        .insert({
          customer_id: customer.id,
          business_id: business_id,
          email: customer.email,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (inviteError) {
        console.error('Error creating invite:', inviteError);
        return new Response(
          JSON.stringify({ error: 'Failed to create invite' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      invite = newInvite;
    }

    // Send invite email - use invite token link
    const inviteToken = invite.invite_token || invite.id;
    const portalUrl = `https://servicegrid.lovable.app/customer-invite/${inviteToken}`;
    const businessName = (customer.businesses as any)?.name || 'Your Service Provider';

    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'ServiceGrid <noreply@servicegrid.app>',
            to: [customer.email],
            subject: `You're invited to view your projects - ${businessName}`,
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Hi ${customer.name},</h2>
                <p><strong>${businessName}</strong> has invited you to access your customer portal.</p>
                <p>Through your portal, you can:</p>
                <ul>
                  <li>View your project status and updates</li>
                  <li>Access quotes and invoices</li>
                  <li>See your upcoming schedule</li>
                  <li>Communicate with the team</li>
                </ul>
                <a href="${portalUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                  Access Your Portal
                </a>
                <p style="color: #666; font-size: 14px;">You can sign in using your email <strong>${customer.email}</strong> via magic link or create a password.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="color: #999; font-size: 12px;">${businessName}</p>
              </div>
            `,
          }),
        });

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text();
          console.error('Failed to send invite email:', errorText);
        } else {
          console.log('Invite email sent successfully to:', customer.email);
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
      }
    } else {
      console.log('RESEND_API_KEY not configured, invite URL:', portalUrl);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invite sent to ${customer.email}`,
        invite_id: invite.id,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Customer portal invite error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
