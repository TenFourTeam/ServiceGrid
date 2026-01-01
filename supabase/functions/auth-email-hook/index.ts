import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import * as crypto from "https://deno.land/std@0.190.0/crypto/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "ServiceGrid <noreply@servicegrid.com>";
const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET");

// Email type definitions
interface EmailPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: {
      full_name?: string;
      name?: string;
    };
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: 'signup' | 'recovery' | 'magiclink' | 'invite' | 'email_change';
    site_url?: string;
    token_new?: string;
    token_hash_new?: string;
    new_email?: string;
  };
}

// Verify webhook signature from Supabase
async function verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
  if (!hookSecret) {
    console.warn("[auth-email-hook] No SEND_EMAIL_HOOK_SECRET configured - skipping signature verification");
    return true;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(hookSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Supabase sends signature as hex
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(payload)
    );

    return isValid;
  } catch (error) {
    console.error("[auth-email-hook] Signature verification error:", error);
    return false;
  }
}

// Generate email templates
function getEmailSubject(actionType: string): string {
  switch (actionType) {
    case 'signup':
      return 'Confirm your ServiceGrid account';
    case 'recovery':
      return 'Reset your ServiceGrid password';
    case 'magiclink':
      return 'Your ServiceGrid login link';
    case 'invite':
      return 'You\'ve been invited to ServiceGrid';
    case 'email_change':
      return 'Confirm your new email address';
    default:
      return 'ServiceGrid - Action Required';
  }
}

// Derive the correct base URL, avoiding localhost
function getSiteUrl(email_data: EmailPayload['email_data']): string {
  const fallbackUrl = 'https://servicegrid.app';
  
  // Check for env override first
  const envBaseUrl = Deno.env.get('APP_BASE_URL');
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, '');
  }
  
  // Try to derive from redirect_to (most reliable - set by frontend)
  if (email_data.redirect_to) {
    try {
      const redirectUrl = new URL(email_data.redirect_to);
      const origin = redirectUrl.origin;
      // Skip localhost/127.0.0.1
      if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return origin;
      }
    } catch {
      // Invalid URL, continue to next option
    }
  }
  
  // Try site_url but skip localhost
  if (email_data.site_url) {
    try {
      const siteOrigin = new URL(email_data.site_url).origin;
      if (!siteOrigin.includes('localhost') && !siteOrigin.includes('127.0.0.1')) {
        return siteOrigin;
      }
    } catch {
      // Invalid URL
    }
  }
  
  return fallbackUrl;
}

function getEmailContent(payload: EmailPayload): { heading: string; message: string; buttonText: string; actionUrl: string } {
  const { user, email_data } = payload;
  const userName = user.user_metadata?.full_name || user.user_metadata?.name || 'there';
  const siteUrl = getSiteUrl(email_data);
  
  // Build confirmation URL with token
  let actionUrl = '';
  
  switch (email_data.email_action_type) {
    case 'signup':
      actionUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=signup&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;
      return {
        heading: `Welcome to ServiceGrid, ${userName}!`,
        message: 'Thank you for signing up! Please confirm your email address to get started with managing your service business.',
        buttonText: 'Confirm Email',
        actionUrl
      };
      
    case 'recovery':
      actionUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=recovery&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;
      return {
        heading: 'Reset Your Password',
        message: 'We received a request to reset your password. Click the button below to create a new password. If you didn\'t request this, you can safely ignore this email.',
        buttonText: 'Reset Password',
        actionUrl
      };
      
    case 'magiclink':
      actionUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=magiclink&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;
      return {
        heading: 'Your Login Link',
        message: 'Click the button below to sign in to your ServiceGrid account. This link will expire in 1 hour.',
        buttonText: 'Sign In',
        actionUrl
      };
      
    case 'invite':
      actionUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=invite&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;
      return {
        heading: 'You\'ve Been Invited!',
        message: 'You\'ve been invited to join a team on ServiceGrid. Click below to accept the invitation and set up your account.',
        buttonText: 'Accept Invitation',
        actionUrl
      };
      
    case 'email_change':
      actionUrl = `${siteUrl}/auth/confirm?token_hash=${email_data.token_hash}&type=email_change&redirect_to=${encodeURIComponent(email_data.redirect_to)}`;
      return {
        heading: 'Confirm Your New Email',
        message: `Please confirm that you want to change your email address to ${email_data.new_email || user.email}.`,
        buttonText: 'Confirm Email Change',
        actionUrl
      };
      
    default:
      return {
        heading: 'Action Required',
        message: 'Please click the button below to complete your action.',
        buttonText: 'Continue',
        actionUrl: email_data.redirect_to
      };
  }
}

function buildEmailHtml(content: { heading: string; message: string; buttonText: string; actionUrl: string }): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.heading}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);">
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td>
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">
                      ServiceGrid
                    </h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 600; color: #0f172a;">
                ${content.heading}
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 1.6; color: #475569;">
                ${content.message}
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="padding: 8px 0;">
                    <a href="${content.actionUrl}" 
                       style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);">
                      ${content.buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Fallback link -->
              <p style="margin: 24px 0 0 0; font-size: 14px; color: #94a3b8;">
                If the button doesn't work, copy and paste this link into your browser:
              </p>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #64748b; word-break: break-all;">
                <a href="${content.actionUrl}" style="color: #2563eb;">${content.actionUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center;">
                This email was sent by ServiceGrid. If you didn't request this, you can safely ignore it.
              </p>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8; text-align: center;">
                © ${new Date().getFullYear()} ServiceGrid. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

const handler = async (req: Request): Promise<Response> => {
  console.log("[auth-email-hook] Received request:", req.method);
  
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const rawBody = await req.text();
    console.log("[auth-email-hook] Raw payload received");

    // Verify webhook signature if secret is configured
    const signature = req.headers.get('x-supabase-signature');
    if (hookSecret && signature) {
      const isValid = await verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error("[auth-email-hook] Invalid webhook signature");
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      console.log("[auth-email-hook] Signature verified");
    }

    const payload: EmailPayload = JSON.parse(rawBody);
    console.log("[auth-email-hook] Email action type:", payload.email_data.email_action_type);
    console.log("[auth-email-hook] Recipient:", payload.user.email);

    // Generate email content
    const content = getEmailContent(payload);
    const subject = getEmailSubject(payload.email_data.email_action_type);
    const html = buildEmailHtml(content);

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [payload.user.email],
      subject: subject,
      html: html,
    });

    console.log("[auth-email-hook] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.data?.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("[auth-email-hook] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

serve(handler);
