
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const NYLAS_API_KEY = Deno.env.get("NYLAS_API_KEY") as string;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) console.error("nylas-send-email: Missing Supabase env");
if (!NYLAS_API_KEY) console.error("nylas-send-email: Missing NYLAS_API_KEY");

interface SendPayload {
  to: string;
  subject: string;
  html: string;
  reply_to?: string;
  from_name?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace("Bearer ", "");
    if (!accessToken) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: auth, error: userErr } = await supabase.auth.getUser(accessToken);
    if (userErr || !auth?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { to, subject, html, reply_to, from_name } = (await req.json()) as SendPayload;
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: sender } = await supabase
      .from("email_senders")
      .select("*")
      .eq("user_id", auth.user.id)
      .single();

    if (!sender?.nylas_grant_id) {
      return new Response(JSON.stringify({ error: "Mailbox not connected via Nylas" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const replyTo = reply_to || sender.reply_to || sender.from_email;

    const body = {
      to: [{ email: to }],
      subject,
      body: [{ type: "text/html", content: html }],
      reply_to: [{ email: replyTo, name: from_name || sender.from_name || sender.from_email }],
    };

    const resp = await fetch(`https://api.us.nylas.com/v3/grants/${sender.nylas_grant_id}/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NYLAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    let json: any = {};
    try { json = text ? JSON.parse(text) : {}; } catch {}

    const ok = resp.status === 200 || resp.status === 202 || resp.status === 201;
    await supabase.from("email_logs").insert({
      user_id: auth.user.id,
      provider: "nylas",
      to_email: to,
      subject,
      status: ok ? "accepted" : `error:${resp.status}`,
      message_id: json?.data?.id || json?.id || null,
      error: ok ? null : text,
      payload: body as any,
    });

    if (!ok) {
      console.error("nylas-send-email: error", resp.status, text);
      return new Response(JSON.stringify({ ok: false, error: "Failed to send email", details: text }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: true, id: json?.data?.id || json?.id || null }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("nylas-send-email error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
