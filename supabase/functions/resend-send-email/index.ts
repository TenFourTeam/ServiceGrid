
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SendRequest = {
  to: string;
  subject: string;
  html: string;
  quote_id?: string;
  reply_to?: string;
  from_name?: string;
};

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
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
    return new Response(JSON.stringify({ error: "Email sending not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const authHeader = req.headers.get("Authorization") || "";

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let payload: SendRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  if (!payload?.to || !payload?.subject || !payload?.html) {
    return new Response(JSON.stringify({ error: "Missing required fields (to, subject, html)" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  // Try to get authenticated user if provided (optional)
  let userId: string | null = null;
  try {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData?.user?.id ?? null;
  } catch (_) {
    userId = null;
  }

  // Compute request hash for idempotency/logging
  const encoder = new TextEncoder();
  const hash = toHex(await crypto.subtle.digest("SHA-256", encoder.encode(JSON.stringify({
    to: payload.to, subject: payload.subject, html: payload.html, quote_id: payload.quote_id || null
  }))));

  const resend = new Resend(resendApiKey);

  const fromName = payload.from_name || undefined;
  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

  // Idempotency: if we've already sent this request successfully, return previous result
  try {
    const { data: existing } = await supabaseAdmin
      .from('mail_sends')
      .select('id,status,provider_message_id,created_at')
      .eq('request_hash', hash)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length && existing[0].status === 'sent') {
      return new Response(JSON.stringify({ id: existing[0].provider_message_id, status: 'duplicate' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  } catch (e) {
    console.warn('Idempotency lookup failed', e);
  }

  const text = payload.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  try {
    const sendRes = await resend.emails.send({
      from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
      text,
      reply_to: payload.reply_to ? payload.reply_to : undefined,
    });

    if (sendRes.error) {
      const message = String(sendRes.error?.message || 'Unknown error');
      console.error('Resend send error:', sendRes.error);

      await supabaseAdmin.from('mail_sends').insert({
        user_id: userId,
        to_email: payload.to,
        subject: payload.subject,
        status: 'failed',
        error_code: 'resend_error',
        error_message: message,
        provider_message_id: null,
        request_hash: hash,
        quote_id: payload.quote_id || null,
      } as any);

      // Friendly errors
      const lower = message.toLowerCase();
      let friendly = message;
      if (lower.includes('domain') && lower.includes('not') && lower.includes('verify')) {
        friendly = 'Your sending domain is not verified. Verify it at https://resend.com/domains.';
      }

      return new Response(JSON.stringify({ error: friendly }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const messageId = (sendRes as any)?.data?.id ?? null;

    await supabaseAdmin.from('mail_sends').insert({
      user_id: userId,
      to_email: payload.to,
      subject: payload.subject,
      status: 'sent',
      error_code: null,
      error_message: null,
      provider_message_id: messageId,
      request_hash: hash,
      quote_id: payload.quote_id || null,
    } as any);

    // Update quote status to Sent after successful email
    try {
      if (payload.quote_id) {
        await supabaseAdmin
          .from('quotes')
          .update({ status: 'Sent', updated_at: new Date().toISOString(), sent_at: new Date().toISOString() } as any)
          .eq('id', payload.quote_id);
      }
    } catch (e) {
      console.warn('Failed to update quote status to Sent:', e);
    }

    return new Response(JSON.stringify({ id: messageId, status: 'sent' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e: any) {
    console.error('Unexpected send error:', e);

    await supabaseAdmin.from('mail_sends').insert({
      user_id: userId,
      to_email: payload.to,
      subject: payload.subject,
      status: 'failed',
      error_code: 'exception',
      error_message: String(e?.message || e || 'Unknown error'),
      provider_message_id: null,
      request_hash: hash,
      quote_id: payload.quote_id || null,
    } as any);

    return new Response(JSON.stringify({ error: e?.message || 'Send failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
