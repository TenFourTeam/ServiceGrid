
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") as string;
const NYLAS_API_KEY = Deno.env.get("NYLAS_API_KEY") as string;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("send-quote: Missing Supabase env variables");
}
if (!SENDGRID_API_KEY) {
  console.warn("send-quote: Missing SENDGRID_API_KEY (SendGrid path will fail)");
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
    const accessToken = authHeader.replace("Bearer ", "");

    if (!accessToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(accessToken);

    if (userErr || !user) {
      console.error("send-quote: getUser error", userErr);
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
      .eq("user_id", user.id)
      .single();

    if (senderErr || !sender) {
      console.warn("send-quote: sender not configured", senderErr);
      return new Response(JSON.stringify({ error: "Email sender not configured. Please set it up in Settings." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const from_email = sender.from_email as string;
    const from_name = (sender.from_name as string) || "Quotes";
    const reply_to = (sender.reply_to as string) || from_email;

    // Branch: Nylas (preferred when connected)
    if (sender.provider === "nylas" && sender.nylas_grant_id) {
      if (!NYLAS_API_KEY) {
        return new Response(JSON.stringify({ error: "Nylas not available" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

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
        user_id: user.id,
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
    }

    // Branch: SendGrid (legacy path) — require verified only for SendGrid
    if (!sender.verified) {
      return new Response(JSON.stringify({ error: "Email sender is not verified. Please verify via the email from SendGrid." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Build SendGrid v3 Mail Send request
    const body = {
      personalizations: [
        {
          to: [{ email: to }],
        },
      ],
      from: { email: from_email, name: from_name },
      reply_to: { email: reply_to, name: from_name },
      subject,
      content: [{ type: "text/html", value: html }],
      categories: ["quotes"],
    };

    const sgResp = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (sgResp.status !== 202) {
      const errText = await sgResp.text();
      let details: any = null;
      try { details = errText ? JSON.parse(errText) : null; } catch {}
      const message = Array.isArray(details?.errors)
        ? details.errors.map((e: any) => e.message).join("; ")
        : errText;
      console.error("send-quote: sendgrid error", sgResp.status, message);

      await supabase.from("email_logs").insert({
        user_id: user.id,
        provider: "sendgrid",
        to_email: to,
        subject,
        status: `error:${sgResp.status}`,
        error: message || errText,
        payload: { subject, to, html },
      });

      return new Response(JSON.stringify({ ok: false, error: "Failed to send email", details: message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("send-quote: email accepted by SendGrid");
    await supabase.from("email_logs").insert({
      user_id: user.id,
      provider: "sendgrid",
      to_email: to,
      subject,
      status: "accepted",
      payload: { subject, to, html },
    });

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
