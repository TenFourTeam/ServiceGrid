
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

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("send-quote: Missing Supabase env variables");
}
if (!SENDGRID_API_KEY) {
  console.error("send-quote: Missing SENDGRID_API_KEY");
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

    if (!sender.verified) {
      return new Response(JSON.stringify({ error: "Email sender is not verified. Please verify via the email from SendGrid." }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const from_email = sender.from_email as string;
    const from_name = (sender.from_name as string) || "Quotes";
    const reply_to = (sender.reply_to as string) || from_email;

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
      console.error("send-quote: sendgrid error", sgResp.status, errText);
      return new Response(JSON.stringify({ ok: false, error: "Failed to send email", details: errText }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("send-quote: email accepted by SendGrid");
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
