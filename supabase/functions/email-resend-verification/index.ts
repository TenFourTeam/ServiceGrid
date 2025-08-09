
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

    const resp = await fetch(
      `https://api.sendgrid.com/v3/senders/${sender.sendgrid_sender_id}/resend_verification`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
      }
    );

    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 404) {
        console.warn(
          "email-resend-verification: sender not found on SendGrid (404). Clearing local sender id."
        );
        await supabase
          .from("email_senders")
          .update({ sendgrid_sender_id: null, verified: false, status: "missing" })
          .eq("id", sender.id);
        return new Response(
          JSON.stringify({ ok: false, clearedId: true, message: "Sender missing in SendGrid. Click Save to recreate, then verify." }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      // Treat already-verified as success
      if ((resp.status === 400 || resp.status === 409) && /already\s*verified/i.test(t)) {
        console.info("email-resend-verification: sender already verified");
        return new Response(JSON.stringify({ ok: true, alreadyVerified: true }), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      console.error("email-resend-verification: sendgrid error", resp.status, t);
      return new Response(JSON.stringify({ error: "SendGrid error", details: t }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("email-resend-verification error", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
