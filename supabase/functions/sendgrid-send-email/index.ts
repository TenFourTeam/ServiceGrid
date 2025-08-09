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
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY");
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

interface SendBody {
  to: string;
  subject: string;
  html: string;
  from_email?: string;
  from_name?: string;
  quote_id?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: auth } = await supabase.auth.getUser(token);

    let userId = auth?.user?.id as string | undefined;
    if (!userId && CLERK_SECRET_KEY) {
      try {
        const payload: any = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
        userId = payload.sub as string;
      } catch {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    }
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { to, subject, html, from_email, from_name, quote_id }: SendBody = await req.json();
    if (!to || !subject || !html) return new Response(JSON.stringify({ error: "Missing to/subject/html" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    // Determine sending identity
    let chosenFromEmail = from_email?.trim();
    let chosenFromName = from_name?.trim();

    let matchedDomain: string | null = null;
    if (chosenFromEmail && chosenFromEmail.includes("@")) {
      matchedDomain = chosenFromEmail.split("@")[1].toLowerCase();
    }

    // Try to find a verified domain; prioritize matching domain, otherwise any verified domain
    let domainRow: any = null;
    if (matchedDomain) {
      const { data } = await supabase
        .from("email_domains")
        .select("*")
        .eq("user_id", userId)
        .eq("domain", matchedDomain)
        .eq("status", "verified")
        .maybeSingle();
      domainRow = data;
    }
    if (!domainRow) {
      const { data } = await supabase
        .from("email_domains")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "verified")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      domainRow = data;
    }

    if (!domainRow) {
      return new Response(JSON.stringify({ error: "No verified sending domain found. Go to Settings > Email Sending to set one up." }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    if (!chosenFromEmail) {
      chosenFromEmail = domainRow.default_from_email || `no-reply@${domainRow.domain}`;
    }
    if (!chosenFromName) {
      chosenFromName = domainRow.default_from_name || "Quotes";
    }

    // Log initial mail send attempt
    const request_hash = btoa(`${Date.now()}-${Math.random()}`);
    const { data: logRow } = await supabase
      .from("mail_sends")
      .insert({
        user_id: userId,
        to_email: to,
        subject,
        status: "pending",
        request_hash,
        quote_id: quote_id || null,
      })
      .select("id")
      .maybeSingle();

    // Send via SendGrid
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: chosenFromEmail, name: chosenFromName },
        subject,
        content: [{ type: "text/html", value: html }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      await supabase
        .from("mail_sends")
        .update({ status: "failed", error_code: String(res.status), error_message: errText })
        .eq("id", logRow?.id);
      return new Response(JSON.stringify({ error: "Failed to send email via SendGrid", details: errText }), { status: res.status || 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const providerMessageId = res.headers.get("x-message-id") || null;
    await supabase
      .from("mail_sends")
      .update({ status: "sent", provider_message_id: providerMessageId })
      .eq("id", logRow?.id);

    return new Response(JSON.stringify({ ok: true, message_id: providerMessageId }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e: any) {
    console.error("sendgrid-send-email error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});