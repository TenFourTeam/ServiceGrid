import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";

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

async function resolveOwnerId(admin: ReturnType<typeof createClient>, clerkUserId: string, email?: string) {
  const { data: byClerk } = await admin.from('profiles').select('id').eq('clerk_user_id', clerkUserId).limit(1);
  if (byClerk && byClerk.length) return byClerk[0].id as string;
  if (email) {
    const { data: byEmail } = await admin.from('profiles').select('id').ilike('email', email.toLowerCase()).limit(1);
    if (byEmail && byEmail.length) return byEmail[0].id as string;
  }
  return null;
}

serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  if (!resendApiKey || !fromEmail) {
    console.error("Missing RESEND_API_KEY or RESEND_FROM_EMAIL");
    return new Response(JSON.stringify({ error: "Email sending not configured." }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Auth: require valid Clerk token
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } });
  }

  let ownerId: string | null = null;
  try {
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const secretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!secretKey) throw new Error('Missing CLERK_SECRET_KEY');
    const clerk = await verifyToken(token, { secretKey });

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    ownerId = await resolveOwnerId(admin, clerk.sub, (clerk as any).email || (clerk as any).claims?.email || undefined);
  } catch (e) {
    console.warn('[resend-send-email] auth failed', e);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json", ...getCorsHeaders(req) } });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  let payload: {
    to?: string; subject: string; html: string; quote_id?: string; job_id?: string; invoice_id?: string; reply_to?: string; from_name?: string;
  };
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
    });
  }

  // Require subject and html
  if (!payload?.subject || !payload?.html) {
    return new Response(JSON.stringify({ error: "Missing required fields (subject, html)" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...getCorsHeaders(req) },
    });
  }

  // Resolve recipient from related entity (invoice, quote, or job) tied to the authenticated owner
  let recipientEmail: string | null = null;
  try {
    if (payload.invoice_id) {
      const { data: inv } = await supabaseAdmin
        .from('invoices')
        .select('id,customer_id,business_id')
        .eq('id', payload.invoice_id)
        .limit(1);
      if (!inv || !inv.length) {
        return new Response(JSON.stringify({ error: 'Invoice not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
      }
      const businessId = inv[0].business_id;
      const { data: b } = await supabaseAdmin.from('businesses').select('owner_id').eq('id', businessId).limit(1);
      if (!b || !b.length || b[0].owner_id !== ownerId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
      }
      const { data: cust } = await supabaseAdmin.from('customers').select('email').eq('id', inv[0].customer_id).limit(1);
      recipientEmail = (cust && cust.length) ? (cust[0].email as string | null) : null;
    } else if (payload.quote_id) {
      const { data: q } = await supabaseAdmin
        .from('quotes')
        .select('id,customer_id,business_id')
        .eq('id', payload.quote_id)
        .limit(1);
      if (!q || !q.length) {
        return new Response(JSON.stringify({ error: 'Quote not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
      }
      const businessId = q[0].business_id;
      const { data: b } = await supabaseAdmin.from('businesses').select('owner_id').eq('id', businessId).limit(1);
      if (!b || !b.length || b[0].owner_id !== ownerId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
      }
      const { data: cust } = await supabaseAdmin.from('customers').select('email').eq('id', q[0].customer_id).limit(1);
      recipientEmail = (cust && cust.length) ? (cust[0].email as string | null) : null;
    } else if (payload.job_id) {
      const { data: j } = await supabaseAdmin
        .from('jobs')
        .select('id,customer_id,business_id')
        .eq('id', payload.job_id)
        .limit(1);
      if (!j || !j.length) {
        return new Response(JSON.stringify({ error: 'Job not found' }), { status: 404, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
      }
      const businessId = j[0].business_id;
      const { data: b } = await supabaseAdmin.from('businesses').select('owner_id').eq('id', businessId).limit(1);
      if (!b || !b.length || b[0].owner_id !== ownerId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) } });
      }
      const { data: cust } = await supabaseAdmin.from('customers').select('email').eq('id', j[0].customer_id).limit(1);
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

      await supabaseAdmin.from('mail_sends').insert({
        user_id: ownerId,
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

    await supabaseAdmin.from('mail_sends').insert({
      user_id: ownerId,
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

    // Update quote status to Sent after successful email, scoped to owner
    try {
      if (payload.quote_id && ownerId) {
        const { data: q } = await supabaseAdmin.from('quotes').select('id,business_id').eq('id', payload.quote_id).limit(1);
        const businessId = q && q.length ? q[0].business_id : null;
        if (businessId) {
          const { data: b } = await supabaseAdmin.from('businesses').select('id,owner_id').eq('id', businessId).limit(1);
          if (b && b.length && b[0].owner_id === ownerId) {
            await supabaseAdmin
              .from('quotes')
              .update({ status: 'Sent', updated_at: new Date().toISOString(), sent_at: new Date().toISOString() } as any)
              .eq('id', payload.quote_id);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to update quote status to Sent:', e);
    }

    // Optionally update invoice status to Sent after successful email, scoped to owner
    try {
      if (payload.invoice_id && ownerId) {
        const { data: inv } = await supabaseAdmin.from('invoices').select('id,business_id').eq('id', payload.invoice_id).limit(1);
        const businessId = inv && inv.length ? inv[0].business_id : null;
        if (businessId) {
          const { data: b } = await supabaseAdmin.from('businesses').select('id,owner_id').eq('id', businessId).limit(1);
          if (b && b.length && b[0].owner_id === ownerId) {
            await supabaseAdmin
              .from('invoices')
              .update({ status: 'Sent', updated_at: new Date().toISOString() } as any)
              .eq('id', payload.invoice_id);
          }
        }
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
