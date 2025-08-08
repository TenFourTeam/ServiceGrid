
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") as string;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { data: sender } = await supabase
      .from("email_senders")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!sender?.sendgrid_sender_id) {
      return new Response(JSON.stringify({ error: "No sender configured" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const sgResp = await fetch(`https://api.sendgrid.com/v3/senders/${sender.sendgrid_sender_id}`, {
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
    });

    const text = await sgResp.text();
    let sgJson: any = {};
    try { sgJson = text ? JSON.parse(text) : {}; } catch { /* ignore */ }

    if (!sgResp.ok) {
      console.error("email-sender-status: sendgrid error", sgResp.status, text);
      return new Response(JSON.stringify({ error: "SendGrid error", details: text }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const verified = !!(sgJson?.verified?.status ?? sgJson?.verified ?? false);

    await supabase
      .from("email_senders")
      .update({
        verified,
        status: sgJson?.verified?.status ? String(sgJson.verified.status) : null,
      })
      .eq("id", sender.id);

    return new Response(JSON.stringify({ ok: true, verified }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("email-sender-status error", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
