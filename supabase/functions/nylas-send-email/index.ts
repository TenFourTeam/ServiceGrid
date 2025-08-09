import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const NYLAS_API_KEY = Deno.env.get("NYLAS_API_KEY") as string;
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) console.error("nylas-send-email: Missing Supabase env");
if (!NYLAS_API_KEY) console.error("nylas-send-email: Missing NYLAS_API_KEY");

interface SendPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
  quote_id?: string;
  request_key?: string; // optional caller-provided idempotency key
  pdf_base64?: string;  // optional PDF attachment (base64)
  pdf_filename?: string; // optional filename for attachment
  reply_to?: string;
  from_name?: string;
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseRetryAfter(h: string | null): number | null {
  if (!h) return null;
  // Prefer seconds value
  const s = parseInt(h, 10);
  if (!Number.isNaN(s)) return Math.max(1, Math.min(s, 30)) * 1000;
  // Date format
  const t = Date.parse(h);
  if (!Number.isNaN(t)) return Math.max(0, t - Date.now());
  return null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    async function resolveUserId(): Promise<string | null> {
      const { data } = await supabase.auth.getUser(token);
      if (data?.user?.id) return data.user.id;
      if (!CLERK_SECRET_KEY) return null;
      try {
        const payload: any = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
        const clerkId: string = payload.sub;
        const email: string | undefined = payload.email || payload.email_address || undefined;
        let { data: prof } = await supabase.from("profiles").select("id").eq("clerk_user_id", clerkId).maybeSingle();
        if (!prof && email) {
          const { data: byEmail } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
          if (byEmail) {
            await supabase.from("profiles").update({ clerk_user_id: clerkId }).eq("id", byEmail.id);
            prof = byEmail as any;
          }
        }
        if (!prof) {
          const newId = crypto.randomUUID();
          await supabase.from("profiles").insert({ id: newId, email: email || "", clerk_user_id: clerkId, updated_at: new Date().toISOString(), created_at: new Date().toISOString() });
          return newId;
        }
        return (prof as any).id as string;
      } catch {
        return null;
      }
    }

    const userId = await resolveUserId();
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { to, subject, html, text, quote_id, request_key, pdf_base64, pdf_filename, reply_to, from_name } = (await req.json()) as SendPayload;
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: sender } = await supabase
      .from("email_senders")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!sender?.nylas_grant_id) {
      return new Response(JSON.stringify({ error: "Mailbox not connected via Nylas" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const replyTo = reply_to || sender.reply_to || sender.from_email;

    // Idempotency key: prefer provided request_key else derive from stable fields
    const reqHash = request_key || (await sha256Hex(JSON.stringify({ userId, quote_id: quote_id || null, to, subject, html_len: html.length })));

    // Check existing outbox record
    const { data: existing } = await supabase
      .from("mail_sends")
      .select("*")
      .eq("user_id", userId)
      .eq("request_hash", reqHash)
      .maybeSingle();

    if (existing && ["pending", "sent", "delivered"].includes((existing as any).status)) {
      return new Response(JSON.stringify({ ok: true, idempotent: true, mail_send: existing }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Insert pending outbox row
    const { data: inserted, error: insErr } = await supabase
      .from("mail_sends")
      .insert({
        user_id: userId,
        quote_id: quote_id || null,
        request_hash: reqHash,
        nylas_grant_id: sender.nylas_grant_id,
        to_email: to,
        subject,
        status: "pending",
      })
      .select()
      .single();

    if (insErr) {
      // If unique violation, race with another request: fetch the record and return it
      const { data: raced } = await supabase
        .from("mail_sends")
        .select("*")
        .eq("user_id", userId)
        .eq("request_hash", reqHash)
        .maybeSingle();
      return new Response(JSON.stringify({ ok: true, idempotent: true, mail_send: raced }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build Nylas request body (v3)
    const nylasBody: any = {
      to: [{ email: to }],
      subject,
      body: [
        { type: "text/html", content: html },
        ...(text ? [{ type: "text/plain", content: text }] : []),
      ],
      reply_to: [{ email: replyTo, name: from_name || sender.from_name || sender.from_email }],
    };

    if (pdf_base64) {
      nylasBody.attachments = [
        {
          filename: pdf_filename || "quote.pdf",
          contentType: "application/pdf",
          data: pdf_base64,
        },
      ];
    }

    // Send with simple backoff for 429/5xx
    async function sendWithRetry(): Promise<{ status: number; text: string; json: any }> {
      let attempt = 0;
      let lastStatus = 0;
      let lastText = "";
      while (attempt < 2) {
        const resp = await fetch(`https://api.us.nylas.com/v3/grants/${sender.nylas_grant_id}/messages/send`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${NYLAS_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nylasBody),
        });
        const text = await resp.text();
        let json: any = {};
        try { json = text ? JSON.parse(text) : {}; } catch {}
        if (resp.status < 500 && resp.status !== 429) return { status: resp.status, text, json };
        lastStatus = resp.status; lastText = text;
        const retryMs = parseRetryAfter(resp.headers.get("Retry-After")) ?? Math.min(8000, 1000 * Math.pow(2, attempt));
        await new Promise((r) => setTimeout(r, retryMs));
        attempt++;
      }
      return { status: lastStatus || 500, text: lastText, json: {} };
    }

    const result = await sendWithRetry();
    const ok = result.status === 200 || result.status === 201 || result.status === 202;
    const providerId = result.json?.data?.id || result.json?.id || null;

    // Update outbox and also log legacy email_logs for continuity
    if (ok) {
      await supabase
        .from("mail_sends")
        .update({ status: "sent", provider_message_id: providerId })
        .eq("id", (inserted as any).id);
    } else {
      await supabase
        .from("mail_sends")
        .update({ status: "failed", error_code: String(result.status), error_message: result.text?.slice(0, 500) || null })
        .eq("id", (inserted as any).id);
    }

    await supabase.from("email_logs").insert({
      user_id: userId,
      provider: "nylas",
      to_email: to,
      subject,
      status: ok ? "accepted" : `error:${result.status}`,
      message_id: providerId,
      error: ok ? null : result.text,
      payload: nylasBody as any,
    });

    if (!ok) {
      console.error("nylas-send-email: error", result.status, result.text);
      return new Response(JSON.stringify({ ok: false, error: "Failed to send email", details: result.text }), {
        status: 502,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: providerId, mail_send_id: (inserted as any).id }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("nylas-send-email error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
