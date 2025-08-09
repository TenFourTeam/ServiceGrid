
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendQuotePayload {
  to: string;
  subject: string;
  html: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const NYLAS_API_KEY = Deno.env.get("NYLAS_API_KEY") as string;
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("send-quote: Missing Supabase env variables");
}
if (!NYLAS_API_KEY) {
  console.warn("send-quote: Missing NYLAS_API_KEY (Nylas path will fail)");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

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
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { to, subject, html } = (await req.json()) as SendQuotePayload;
    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Load sender configuration for this user
    const { data: sender, error: senderErr } = await supabase
      .from("email_senders")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (senderErr || !sender) {
      console.warn("send-quote: sender not configured", senderErr);
      return new Response(JSON.stringify({ error: "Email sender not configured. Please connect your mailbox in Settings." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!sender.nylas_grant_id) {
      return new Response(JSON.stringify({ error: "Mailbox not connected via Nylas" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const from_email = sender.from_email as string;
    const from_name = (sender.from_name as string) || "Quotes";
    const reply_to = (sender.reply_to as string) || from_email;

    const body = {
      to: [{ email: to }],
      subject,
      body: [{ type: "text/html", content: html }],
      reply_to: [{ email: reply_to, name: from_name }],
    };

    const nylasResp = await fetch(`https://api.us.nylas.com/v3/grants/${sender.nylas_grant_id}/messages/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NYLAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const nylasText = await nylasResp.text();
    let nylasJson: any = {};
    try { nylasJson = nylasText ? JSON.parse(nylasText) : {}; } catch {}

    const ok = nylasResp.status === 200 || nylasResp.status === 201 || nylasResp.status === 202;

    await supabase.from("email_logs").insert({
      user_id: userId,
      provider: "nylas",
      to_email: to,
      subject,
      status: ok ? "accepted" : `error:${nylasResp.status}`,
      message_id: nylasJson?.data?.id || nylasJson?.id || null,
      error: ok ? null : nylasText,
      payload: { subject, to, html },
    });

    if (!ok) {
      console.error("send-quote: nylas error", nylasResp.status, nylasText);
      return new Response(JSON.stringify({ ok: false, error: "Failed to send email", details: nylasText }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("send-quote: email accepted by Nylas");
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("send-quote error", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
