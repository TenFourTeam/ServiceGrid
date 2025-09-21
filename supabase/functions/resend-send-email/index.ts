import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireCtx, corsHeaders } from "../_lib/auth.ts";

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

function toHex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Remove the resolveOwnerId function - using requireCtx instead

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendApiKey || !fromEmail) {
    console.error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL environment variables");
    return new Response(JSON.stringify({ error: "Email sending not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth: require valid Clerk token and business context
  let ctx: any;
  try {
    ctx = await requireCtx(req);
  } catch (e) {
    console.warn('[resend-send-email] auth failed', e);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } });
  }

  // Remove duplicate supabase client creation - already available as supabaseAdmin

  let payload: {
    to?: string; subject?: string; html?: string; quote_id?: string; job_id?: string; invoice_id?: string; reply_to?: string; from_name?: string;
  } = {};
  try {
    payload = await req.json();
  } catch (e) {
    console.warn('[resend-send-email] Invalid JSON payload', e);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
    });
  }

  const presentKeys = Object.keys(payload || {}).filter(k => k !== 'html');
  console.info('[resend-send-email] payload received keys', presentKeys);
  if (payload?.to) {
    console.info("[resend-send-email] 'to' provided by client will be ignored; recipient resolved server-side");
  }

  // Require subject and html
  if (!payload?.subject || !payload?.html) {
    const missing = [!payload?.subject ? 'subject' : null, !payload?.html ? 'html' : null].filter(Boolean).join(', ');
    console.warn('[resend-send-email] missing fields', missing);
    return new Response(JSON.stringify({ error: `Missing required fields (${missing})` }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
    });
  }

  // Resolve recipient and business info from related entity tied to the authenticated owner
  let recipientEmail: string | null = null;
  let businessName: string | null = null;
  let emailType: 'system' | 'business' = 'business';
  
  try {
    if (payload.invoice_id) {
      const { data: inv } = await ctx.supaAdmin
        .from('invoices')
        .select('id,customer_id,business_id')
        .eq('id', payload.invoice_id)
        .eq('business_id', ctx.businessId)
        .limit(1);
      if (!inv || !inv.length) {
        return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
      }
      const { data: b } = await ctx.supaAdmin.from('businesses').select('name').eq('id', ctx.businessId).limit(1);
      if (!b || !b.length) {
        return new Response(JSON.stringify({ error: 'Business not found' }), { status: 403, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
      }
      businessName = b[0].name;
      const { data: cust } = await ctx.supaAdmin.from('customers').select('email').eq('id', inv[0].customer_id).eq('business_id', ctx.businessId).limit(1);
      recipientEmail = (cust && cust.length) ? (cust[0].email as string | null) : null;
    } else if (payload.quote_id) {
      const { data: q } = await ctx.supaAdmin
        .from('quotes')
        .select('id,customer_id,business_id,is_subscription')
        .eq('id', payload.quote_id)
        .eq('business_id', ctx.businessId)
        .limit(1);
      if (!q || !q.length) {
        return new Response(JSON.stringify({ error: 'Quote not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
      }
      const { data: b } = await ctx.supaAdmin.from('businesses').select('name').eq('id', ctx.businessId).limit(1);
      if (!b || !b.length) {
        return new Response(JSON.stringify({ error: 'Business not found' }), { status: 403, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
      }
      businessName = b[0].name;
      const { data: cust } = await ctx.supaAdmin.from('customers').select('email').eq('id', q[0].customer_id).eq('business_id', ctx.businessId).limit(1);
      recipientEmail = (cust && cust.length) ? (cust[0].email as string | null) : null;
    } else if (payload.job_id) {
      const { data: j } = await ctx.supaAdmin
        .from('jobs')
        .select('id,customer_id,business_id')
        .eq('id', payload.job_id)
        .eq('business_id', ctx.businessId)
        .limit(1);
      if (!j || !j.length) {
        return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
      }
      const { data: b } = await ctx.supaAdmin.from('businesses').select('name').eq('id', ctx.businessId).limit(1);
      if (!b || !b.length) {
        return new Response(JSON.stringify({ error: 'Business not found' }), { status: 403, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
      }
      businessName = b[0].name;
      const { data: cust } = await ctx.supaAdmin.from('customers').select('email').eq('id', j[0].customer_id).eq('business_id', ctx.businessId).limit(1);
      recipientEmail = (cust && cust.length) ? (cust[0].email as string | null) : null;
    } else {
      return new Response(JSON.stringify({ error: 'Missing quote_id, invoice_id, or job_id' }), { status: 400, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
    }
  } catch (e) {
    console.error('[resend-send-email] recipient resolution failed', e);
    return new Response(JSON.stringify({ error: 'Failed to resolve recipient' }), { status: 500, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!recipientEmail || !emailRe.test(recipientEmail)) {
    return new Response(JSON.stringify({ error: 'Customer has no valid email on file' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
    });
  }

  // Compute request hash for idempotency/logging (using derived recipient)
  const encoder = new TextEncoder();
  const hash = toHex(await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify({
    to: recipientEmail, subject: payload.subject, html: payload.html, quote_id: payload.quote_id || null, job_id: payload.job_id || null, invoice_id: payload.invoice_id || null,
  }))));

  const resend = new Resend(resendApiKey);
  
  // Smart sender logic: use business name for business emails, system name for system emails
  let from: string;
  if (payload.from_name) {
    // Explicit from_name provided (backwards compatibility)
    from = `${payload.from_name} <${fromEmail}>`;
  } else if (businessName && emailType === 'business') {
    // Business email: use business name as sender
    from = `${businessName} <${fromEmail}>`;
  } else {
    // System email or fallback: use configured email only
    from = fromEmail;
  }

  // Idempotency: if we've already sent this request successfully, return previous result
  try {
    const { data: existing } = await ctx.supaAdmin
      .from('mail_sends')
      .select('id,status,provider_message_id,created_at')
      .eq('request_hash', hash)
      .order('created_at', { ascending: false })
      .limit(1);

    if (existing && existing.length && existing[0].status === 'sent') {
      return new Response(JSON.stringify({ id: existing[0].provider_message_id, status: 'duplicate' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
      });
    }
  } catch (e) {
    console.warn('Idempotency lookup failed', e);
  }

  const text = payload.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  try {
    const sendRes = await resend.emails.send({
      from,
      to: [recipientEmail],
      subject: payload.subject,
      html: payload.html,
      text,
      reply_to: payload.reply_to ? payload.reply_to : undefined,
    });

    if ((sendRes as any)?.error) {
      const message = String((sendRes as any)?.error?.message || 'Unknown error');
      console.error('Resend send error:', (sendRes as any)?.error);

      await ctx.supaAdmin.from('mail_sends').insert({
        user_id: ctx.userId,
        to_email: recipientEmail,
        subject: payload.subject,
        status: 'failed',
        error_code: 'resend_error',
        error_message: message,
        provider_message_id: null,
        request_hash: hash,
        quote_id: payload.quote_id || null,
        job_id: payload.job_id || null,
        invoice_id: payload.invoice_id || null,
      } as any);

      const lower = message.toLowerCase();
      let friendly = message;
      if (lower.includes('domain') && lower.includes('not') && lower.includes('verify')) {
        friendly = 'Your sending domain is not verified. Verify it at https://resend.com/domains.';
      }

      return new Response(JSON.stringify({ error: friendly }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
      });
    }

    const messageId = (sendRes as any)?.data?.id ?? null;

    await ctx.supaAdmin.from('mail_sends').insert({
      user_id: ctx.userId,
      to_email: recipientEmail,
      subject: payload.subject,
      status: 'sent',
      error_code: null,
      error_message: null,
      provider_message_id: messageId,
      request_hash: hash,
      quote_id: payload.quote_id || null,
      job_id: payload.job_id || null,
      invoice_id: payload.invoice_id || null,
    } as any);

    // Update quote status to Sent after successful email and handle superseding
    try {
      if (payload.quote_id) {
        const { data: q } = await ctx.supaAdmin
          .from('quotes')
          .select('id,business_id,customer_id,is_subscription')
          .eq('id', payload.quote_id)
          .eq('business_id', ctx.businessId)
          .single();

        if (q) {
          // Update quote status to Sent
          await ctx.supaAdmin
            .from('quotes')
            .update({ 
              status: 'Sent', 
              updated_at: new Date().toISOString(), 
              sent_at: new Date().toISOString() 
            })
            .eq('id', payload.quote_id)
            .eq('business_id', ctx.businessId);

          // If this is a subscription quote, supersede previous quotes
          if (q.is_subscription) {
            console.info('[resend-send-email] Superseding previous subscription quotes for customer:', q.customer_id);
            try {
              await ctx.supaAdmin.rpc('supersede_previous_quotes', {
                p_customer_id: q.customer_id,
                p_business_id: ctx.businessId,
                p_new_quote_id: q.id,
                p_is_subscription: true
              });
              console.info('[resend-send-email] Successfully superseded previous quotes');
            } catch (supersedeError) {
              console.error('[resend-send-email] Failed to supersede previous quotes:', supersedeError);
              // Don't fail the email send, just log the error
            }
          }
        }
      }
    } catch (e) {
      console.warn('Failed to update quote status to Sent:', e);
    }

    // Optionally update invoice status to Sent after successful email
    try {
      if (payload.invoice_id) {
        await ctx.supaAdmin
          .from('invoices')
          .update({ status: 'Sent', updated_at: new Date().toISOString() })
          .eq('id', payload.invoice_id)
          .eq('business_id', ctx.businessId);
      }
    } catch (e) {
      console.warn('Failed to update invoice status to Sent:', e);
    }

    return new Response(JSON.stringify({ id: messageId, status: 'sent' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
    });
  } catch (e: any) {
    console.error('Unexpected send error:', e);

    const encoder = new TextEncoder();
    let payload: any = {};
    try { payload = await req.json(); } catch {}
    const hash = toHex(await crypto.subtle.digest("SHA-256", encoder.encode(JSON.stringify(payload))));

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    await supabaseAdmin.from('mail_sends').insert({
      user_id: null,
      to_email: payload?.to || null,
      subject: payload?.subject || null,
      status: 'failed',
      error_code: 'exception',
      error_message: String(e?.message || e || 'Unknown error'),
      provider_message_id: null,
      request_hash: hash,
      quote_id: payload?.quote_id || null,
      job_id: payload?.job_id || null,
      invoice_id: payload?.invoice_id || null,
    } as any);

    return new Response(JSON.stringify({ error: e?.message || 'Send failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) },
    });
  }
});
