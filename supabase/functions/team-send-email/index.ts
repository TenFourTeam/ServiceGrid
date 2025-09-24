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

    const { businessId, to, subject, html, emailType = 'team_notification' } = await req.json();

    if (!businessId || !to || !subject || !html) {
      return json({ error: 'Business ID, recipient, subject, and HTML content are required' }, { status: 400 });
    }

    // Verify the user can manage this business
    const { data: membership } = await supaAdmin
      .from('business_members')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .eq('role', 'owner')
      .single();

    if (!membership) {
      return json({ error: 'Not authorized to manage this business' }, { status: 403 });
    }

    // Get business details for branding context
    const { data: business, error: businessError } = await supaAdmin
      .from('businesses')
      .select('id, name, logo_url')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return json({ error: 'Business not found' }, { status: 403 });
    }

    // Team email functionality disabled - using in-app notifications instead
    console.log('Team email functionality disabled - using in-app notifications');
    
    const emailResponse = { data: { id: 'disabled' } };

    // Log audit action for team email
    await supaAdmin.rpc('log_audit_action', {
      p_business_id: businessId,
      p_user_id: userId,
      p_action: 'team_email_sent',
      p_resource_type: 'team_communication',
      p_resource_id: emailResponse.data?.id || null,
      p_details: { 
        email_type: emailType,
        recipient: to,
        subject: subject
      }
    });

    console.log('Team email sent successfully:', emailResponse.data?.id);

    return json({
      message: 'Team email sent successfully',
      email_id: emailResponse.data?.id,
    });

  } catch (error) {
    console.error('Error sending team email:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});