
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
  reply_to?: string;
  from_name?: string;
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

    const { to, subject, html, reply_to, from_name } = (await req.json()) as SendPayload;
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { data: sender } = await supabase
      .from("email_senders")
      .select("*")
      .eq("user_id", userId)
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
      user_id: userId,
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
