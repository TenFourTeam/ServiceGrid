
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
      // Try to relink by listing senders using current from_email
      try {
        const listResp = await fetch("https://api.sendgrid.com/v3/senders", {
          headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
        });
        const listText = await listResp.text();
        let listJson: any[] = [];
        try { listJson = listText ? JSON.parse(listText) : []; } catch { /* ignore */ }
        if (listResp.ok && Array.isArray(listJson)) {
          const match = listJson.find((s: any) =>
            (s?.from?.email && String(s.from.email).toLowerCase() === String(sender?.from_email || "").toLowerCase())
          );
          if (match) {
            // Compute verified/status
            const vRaw = match?.verified;
            let verified = false;
            if (typeof vRaw === "boolean") verified = vRaw;
            else if (typeof vRaw === "string") verified = vRaw.toLowerCase() === "true";
            else if (vRaw && typeof vRaw?.status === "string") {
              const s = String(vRaw.status).toLowerCase();
              verified = s === "verified" || s === "completed" || s === "approved" || s === "true";
            }
            const providerStatus = vRaw && typeof vRaw?.status === "string" ? String(vRaw.status) : null;
            await supabase.from("email_senders").update({
              sendgrid_sender_id: match.id ?? match.sender_id ?? null,
              verified,
              status: providerStatus,
            }).eq("id", sender.id);
            return new Response(JSON.stringify({ ok: true, verified, relinked: true }), {
              status: 200,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
        }
      } catch { /* ignore */ }
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
      if (sgResp.status === 404) {
        // Try to relink by listing senders
        try {
          const listResp = await fetch("https://api.sendgrid.com/v3/senders", { headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` } });
          const listText = await listResp.text();
          let listJson: any[] = [];
          try { listJson = listText ? JSON.parse(listText) : []; } catch { /* ignore */ }
          if (listResp.ok && Array.isArray(listJson)) {
            const match = listJson.find((s: any) =>
              (s?.from?.email && String(s.from.email).toLowerCase() === String(sender?.from_email || "").toLowerCase())
            );
            if (match) {
              const vRaw = match?.verified;
              let verified = false;
              if (typeof vRaw === "boolean") verified = vRaw;
              else if (typeof vRaw === "string") verified = vRaw.toLowerCase() === "true";
              else if (vRaw && typeof vRaw?.status === "string") {
                const s = String(vRaw.status).toLowerCase();
                verified = s === "verified" || s === "completed" || s === "approved" || s === "true";
              }
              const providerStatus = vRaw && typeof vRaw?.status === "string" ? String(vRaw.status) : null;
              await supabase.from("email_senders").update({
                sendgrid_sender_id: match.id ?? match.sender_id ?? null,
                verified,
                status: providerStatus,
              }).eq("id", sender.id);
              return new Response(JSON.stringify({ ok: true, verified, relinked: true, note: "Relinked existing sender in SendGrid." }), {
                status: 200,
                headers: { "Content-Type": "application/json", ...corsHeaders },
              });
            }
          }
        } catch { /* ignore */ }
        console.warn("email-sender-status: sender not found on SendGrid (404). Clearing local sender id.");
        await supabase
          .from("email_senders")
          .update({ sendgrid_sender_id: null, verified: false, status: "missing" })
          .eq("id", sender.id);
        return new Response(
          JSON.stringify({ ok: true, verified: false, clearedId: true, note: "Sender missing in SendGrid. Please save again to recreate." }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.error("email-sender-status: sendgrid error", sgResp.status, text);
      return new Response(JSON.stringify({ error: "SendGrid error", details: text }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Strict verification check
    const sgVerifiedRaw = sgJson?.verified;
    let verified = false;
    if (typeof sgVerifiedRaw === "boolean") {
      verified = sgVerifiedRaw;
    } else if (typeof sgVerifiedRaw === "string") {
      verified = sgVerifiedRaw.toLowerCase() === "true";
    } else if (sgVerifiedRaw && typeof sgVerifiedRaw?.status === "string") {
      const s = String(sgVerifiedRaw.status).toLowerCase();
      verified = s === "verified" || s === "completed" || s === "approved" || s === "true";
    }
    const providerStatus =
      sgVerifiedRaw && typeof sgVerifiedRaw?.status === "string" ? String(sgVerifiedRaw.status) : null;

    await supabase
      .from("email_senders")
      .update({
        verified,
        status: providerStatus,
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
