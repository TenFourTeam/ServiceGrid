import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";
import { Resend } from 'https://esm.sh/resend@4.0.0';

// Import email templates - simplified versions since we can't import from src
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

interface LifecycleEmailData {
  userFullName?: string;
  userEmail?: string;
  businessName?: string;
  businessId?: string;
  userId?: string;
  signupDate?: string;
  lastLoginDate?: string;
}

function generateWelcomeEmail(data: LifecycleEmailData, appUrl: string) {
  const { businessName, userFullName } = data;
  const subject = `Welcome to ServiceGrid, ${userFullName || 'there'}!`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ServiceGrid</title>
      </head>
      <body style="margin:0; padding:0; background:#f1f5f9; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9; padding:40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background:#ffffff; border:1px solid #e5e7eb; border-radius:12px; overflow:hidden;">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding:32px; text-align:center;">
                    <h1 style="margin:0; color:#f8fafc; font-size:32px; font-weight:700;">
                      Welcome to ServiceGrid! 🎉
                    </h1>
                    <p style="margin:12px 0 0; color:#cbd5e1; font-size:16px;">
                      Your business management journey starts here
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:40px 32px;">
                    
                    <div style="margin-bottom:32px;">
                      <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#374151;">
                        Hi${userFullName ? ` ${escapeHtml(userFullName)}` : ''},
                      </p>
                      <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#374151;">
                        Congratulations on setting up your ${businessName ? escapeHtml(businessName) : 'business'} account! You're now equipped with powerful tools to streamline your service business operations.
                      </p>
                    </div>

                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:24px; margin-bottom:32px;">
                      <h2 style="margin:0 0 16px; font-size:18px; font-weight:600; color:#111827;">Here's what you can do next:</h2>
                      <ul style="margin:0; padding-left:20px; color:#374151; line-height:1.7;">
                        <li style="margin-bottom:8px;">Add your first customer and create a quote</li>
                        <li style="margin-bottom:8px;">Set up your calendar for job scheduling</li>
                        <li style="margin-bottom:8px;">Configure your business profile and branding</li>
                        <li style="margin-bottom:8px;">Connect Stripe to start accepting payments</li>
                      </ul>
                    </div>

                    <div style="text-align:center; margin-bottom:32px;">
                      <a href="${appUrl}/customers" 
                         style="display:inline-block; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color:#ffffff; padding:16px 32px; border-radius:8px; text-decoration:none; font-weight:600; font-size:16px;">
                        Get Started →
                      </a>
                    </div>

                    <div style="text-align:center; font-size:14px; color:#6b7280;">
                      Need help? Just reply to this email - we're here to support your success!
                    </div>

                  </td>
                </tr>

                <tr>
                  <td style="background:#f8fafc; padding:24px 32px; border-top:1px solid #e5e7eb; text-align:center;">
                    <p style="margin:0; font-size:12px; color:#6b7280;">
                      © ServiceGrid - Professional service management made simple
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { subject, html };
}

function generateFeatureDiscoveryEmail(data: LifecycleEmailData, params: any, appUrl: string) {
  const { userFullName } = data;
  const { featureName, featureDescription, featureUrl, daysFromSignup } = params;
  
  const subject = `Day ${daysFromSignup}: Discover ${featureName}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${featureName} - ServiceGrid Feature</title>
      </head>
      <body style="margin:0; padding:0; background:#f1f5f9; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9; padding:40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background:#ffffff; border-radius:8px; overflow:hidden;">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding:24px 32px;">
                    <h1 style="margin:0; color:#f8fafc; font-size:24px; font-weight:600;">
                      ${escapeHtml(featureName)}
                    </h1>
                    <p style="margin:8px 0 0; color:#cbd5e1; font-size:14px;">
                      Day ${daysFromSignup} Feature Discovery
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px;">
                    
                    <div style="margin-bottom:24px;">
                      <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#374151;">
                        Hi${userFullName ? ` ${escapeHtml(userFullName)}` : ''},
                      </p>
                      <p style="margin:0; font-size:16px; line-height:1.6; color:#374151;">
                        ${escapeHtml(featureDescription)}
                      </p>
                    </div>

                    <div style="text-align:center; margin-bottom:24px;">
                      <a href="${featureUrl?.startsWith('/') ? `${appUrl}${featureUrl}` : featureUrl || `${appUrl}/customers`}" 
                         style="display:inline-block; background:#1e293b; color:#ffffff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
                        Try ${escapeHtml(featureName)} →
                      </a>
                    </div>

                    <div style="text-align:center; font-size:14px; color:#6b7280;">
                      Questions? Just reply to this email!
                    </div>

                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { subject, html };
}

function generateMilestoneEmail(data: LifecycleEmailData, params: any, appUrl: string) {
  const { userFullName } = data;
  const { milestoneType, nextSteps, ctaText, ctaUrl } = params;
  
  const milestoneConfig: Record<string, any> = {
    quote: { emoji: '📋', title: 'First Quote Created!', message: 'Great start! You\'ve created your first quote.' },
    job: { emoji: '📅', title: 'First Job Scheduled!', message: 'Excellent! You\'re getting organized with job scheduling.' },
    invoice: { emoji: '💰', title: 'First Invoice Sent!', message: 'Awesome! You\'re on your way to getting paid.' },
    stripe: { emoji: '🔗', title: 'Stripe Connected!', message: 'Perfect! You\'re now ready to accept payments.' }
  };
  
  const config = milestoneConfig[milestoneType];
  const subject = `${config.emoji} ${config.title}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${config.title}</title>
      </head>
      <body style="margin:0; padding:0; background:#f1f5f9; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9; padding:40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background:#ffffff; border-radius:8px; overflow:hidden;">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding:32px; text-align:center;">
                    <div style="font-size:48px; margin-bottom:16px;">${config.emoji}</div>
                    <h1 style="margin:0; color:#ffffff; font-size:28px; font-weight:700;">
                      ${config.title}
                    </h1>
                    <p style="margin:12px 0 0; color:#d1fae5; font-size:16px;">
                      ${config.message}
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px;">
                    
                    <div style="margin-bottom:24px;">
                      <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#374151;">
                        Hi${userFullName ? ` ${escapeHtml(userFullName)}` : ''},
                      </p>
                      <p style="margin:0; font-size:16px; line-height:1.6; color:#374151;">
                        ${escapeHtml(nextSteps)}
                      </p>
                    </div>

                    <div style="text-align:center; margin-bottom:24px;">
                      <a href="${ctaUrl?.startsWith('/') ? `${appUrl}${ctaUrl}` : ctaUrl || `${appUrl}/quotes`}" 
                         style="display:inline-block; background:#059669; color:#ffffff; padding:16px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
                        ${escapeHtml(ctaText)}
                      </a>
                    </div>

                    <div style="text-align:center; font-size:14px; color:#6b7280;">
                      Keep up the great work! 🚀
                    </div>

                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { subject, html };
}

function generateEngagementEmail(data: LifecycleEmailData, params: any, appUrl: string) {
  const { userFullName, businessName } = data;
  const { daysInactive, ctaText, ctaUrl } = params;
  
  const subject = daysInactive >= 14 ? 'Need a hand getting started?' : 'Missing you!';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>We Miss You!</title>
      </head>
      <body style="margin:0; padding:0; background:#f1f5f9; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Ubuntu, Cantarell, 'Noto Sans', sans-serif;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f1f5f9; padding:40px 20px;">
          <tr>
            <td align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" width="600" style="max-width:600px; background:#ffffff; border-radius:8px; overflow:hidden;">
                
                <tr>
                  <td style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding:32px; text-align:center;">
                    <div style="font-size:48px; margin-bottom:16px;">👋</div>
                    <h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:600;">
                      We miss you!
                    </h1>
                  </td>
                </tr>

                <tr>
                  <td style="padding:32px;">
                    
                    <div style="margin-bottom:24px;">
                      <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#374151;">
                        Hi${userFullName ? ` ${escapeHtml(userFullName)}` : ''},
                      </p>
                      <p style="margin:0 0 16px; font-size:16px; line-height:1.6; color:#374151;">
                        We noticed you haven't been active with${businessName ? ` ${escapeHtml(businessName)}` : ' your business'} in ServiceGrid for ${daysInactive} days. 
                      </p>
                      <p style="margin:0; font-size:16px; line-height:1.6; color:#374151;">
                        ${daysInactive >= 14 ? 'Need help getting started? We\'re here to support you!' : 'Ready to get back to growing your business?'}
                      </p>
                    </div>

                    <div style="text-align:center; margin-bottom:24px;">
                      <a href="${ctaUrl?.startsWith('/') ? `${appUrl}${ctaUrl}` : ctaUrl || `${appUrl}/calendar`}" 
                         style="display:inline-block; background:#7c3aed; color:#ffffff; padding:16px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
                        ${escapeHtml(ctaText)}
                      </a>
                    </div>

                    <div style="text-align:center; font-size:14px; color:#6b7280;">
                      Questions? Just reply to this email - we're here to help! 💜
                    </div>

                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return { subject, html };
}


serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendApiKey || !fromEmail) {
    console.error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
    return json({ error: "Email sending not configured." }, { status: 500 });
  }

  try {
    const ctx = await requireCtx(req);
    const ownerId = ctx.userId;

    let payload: {
      type: string;
      data: LifecycleEmailData;
      [key: string]: any;
    };

    try {
      payload = await req.json();
    } catch (e) {
      console.warn('[send-lifecycle-email] Invalid JSON payload', e);
      return json({ error: "Invalid JSON" }, { status: 400 });
    }

  const { type, data } = payload;
  const appUrl = Deno.env.get("FRONTEND_URL") || 'https://your-app.com';

    // Validate required fields
    if (!type || !data?.userEmail) {
      return json({ error: "Missing type or data.userEmail" }, { status: 400 });
    }

  // Generate email based on type
  let emailTemplate: { subject: string; html: string };
  
  try {
    switch (type) {
      case 'welcome':
        emailTemplate = generateWelcomeEmail(data, appUrl);
        break;
      case 'feature-discovery':
        emailTemplate = generateFeatureDiscoveryEmail(data, payload, appUrl);
        break;
      case 'milestone':
        emailTemplate = generateMilestoneEmail(data, payload, appUrl);
        break;
      case 'engagement':
        emailTemplate = generateEngagementEmail(data, payload, appUrl);
        break;
      default:
        return json({ error: `Unknown email type: ${type}` }, { status: 400 });
    }
  } catch (e) {
    console.error('[send-lifecycle-email] Template generation failed', e);
    return json({ error: 'Template generation failed' }, { status: 500 });
  }

  // Send email via Resend
  const resend = new Resend(resendApiKey);
  
  try {
    const sendRes = await resend.emails.send({
      from: `ServiceGrid <${fromEmail}>`,
      to: [data.userEmail],
      subject: emailTemplate.subject,
      html: emailTemplate.html,
    });

    if ((sendRes as any)?.error) {
      console.error('Resend send error:', (sendRes as any)?.error);
      
      // Log failed email to mail_sends
      try {
        await ctx.supabase.from('mail_sends').insert({
          user_id: ownerId,
          to_email: data.userEmail,
          subject: emailTemplate.subject,
          status: 'failed',
          error_code: 'RESEND_ERROR',
          error_message: (sendRes as any)?.error?.message || 'Unknown error',
          request_hash: crypto.randomUUID(),
        });
      } catch (logError) {
        console.error('[send-lifecycle-email] Failed to log error to mail_sends:', logError);
      }
      
      return json({ error: (sendRes as any)?.error?.message || 'Email send failed' }, { status: 500 });
    }

    const messageId = (sendRes as any)?.data?.id ?? null;
    
    console.info('[send-lifecycle-email] Email sent:', type, data.userEmail, messageId);

    // Log successful email to mail_sends
    try {
      const requestHash = crypto.randomUUID();
      
      await ctx.supabase.from('mail_sends').insert({
        user_id: ownerId,
        to_email: data.userEmail,
        subject: emailTemplate.subject,
        status: 'sent',
        provider_message_id: messageId,
        request_hash: requestHash,
      });
      
      console.log('[send-lifecycle-email] Logged to mail_sends:', requestHash);
    } catch (logError) {
      console.error('[send-lifecycle-email] Failed to log to mail_sends:', logError);
      // Don't fail the operation if logging fails
    }

    return json({ 
      success: true, 
      messageId,
      type,
      recipient: data.userEmail 
    });

  } catch (e: any) {
    console.error('Unexpected send error:', e);
    
    // Log failed email to mail_sends
    try {
      await ctx.supabase.from('mail_sends').insert({
        user_id: ownerId,
        to_email: data.userEmail,
        subject: emailTemplate?.subject || 'Lifecycle Email',
        status: 'failed',
        error_code: e?.name || 'UNKNOWN_ERROR',
        error_message: e?.message || 'Unknown error',
        request_hash: crypto.randomUUID(),
      });
    } catch (logError) {
      console.error('[send-lifecycle-email] Failed to log error to mail_sends:', logError);
    }
    
    return json({ error: e?.message || 'Send failed' }, { status: 500 });
  }

  } catch (error: any) {
    console.error('Error in send-lifecycle-email:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});