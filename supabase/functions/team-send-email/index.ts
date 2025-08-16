import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || req.headers.get("origin") || "*";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map(s => s.trim()).filter(Boolean);
  const allowOrigin = allowed.length === 0 || allowed.includes("*") || allowed.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "*",
    "Vary": "Origin",
  } as Record<string, string>;
}

async function resolveOwnerId(admin: ReturnType<typeof createClient>, clerkUserId: string, email?: string) {
  const { data: byClerk } = await admin.from('profiles').select('id').eq('clerk_user_id', clerkUserId).limit(1);
  if (byClerk && byClerk.length) return byClerk[0].id as string;
  if (email) {
    const { data: byEmail } = await admin.from('profiles').select('id').ilike('email', email.toLowerCase()).limit(1);
    if (byEmail && byEmail.length) return byEmail[0].id as string;
  }
  return null;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) }
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth: require valid Clerk token
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) }
    });
  }

  let userId: string | null = null;
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const secretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!secretKey) throw new Error('Missing CLERK_SECRET_KEY');
    const clerk = await verifyToken(token, { secretKey });

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    userId = await resolveOwnerId(admin, clerk.sub, (clerk as any).email || (clerk as any).claims?.email || undefined);
  } catch (e) {
    console.warn('[team-send-email] auth failed', e);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) }
    });
  }

  if (!userId) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) }
    });
  }

  const supaAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  try {
    const { businessId, to, subject, html, emailType = 'team_notification' } = await req.json();

    if (!businessId || !to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Business ID, recipient, subject, and HTML content are required' }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req) }
      });
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
      return new Response(JSON.stringify({ error: 'Not authorized to manage this business' }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req) }
      });
    }

    // Get business details for branding context
    const { data: business, error: businessError } = await supaAdmin
      .from('businesses')
      .select('id, name, logo_url')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      return new Response(JSON.stringify({ error: 'Business not found' }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req) }
      });
    }

    // Use RESEND_FROM_EMAIL as primary sender (matches working pattern from other functions)
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@resend.dev';
    const fromName = business.name || 'Team';
    
    console.log('Sending team email with from:', `${fromName} <${fromEmail}>`);

    // Send email using Resend
    const emailResponse = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    });

    if (emailResponse.error) {
      console.error('Failed to send team email:', emailResponse.error);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...getCorsHeaders(req) }
      });
    }

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

    return new Response(JSON.stringify({
      message: 'Team email sent successfully',
      email_id: emailResponse.data?.id,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) }
    });

  } catch (error) {
    console.error('Error sending team email:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) }
    });
  }
});