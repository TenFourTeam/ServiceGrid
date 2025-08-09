
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
      // Try to relink and then resend if needed
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
            const id = match.id ?? match.sender_id;
            const vRaw = match?.verified;
            let isVerified = false;
            if (typeof vRaw === "boolean") isVerified = vRaw;
            else if (vRaw && typeof vRaw?.status === "string") {
              const s = String(vRaw.status).toLowerCase();
              isVerified = s === "verified" || s === "completed" || s === "true";
            }
            const providerStatus = vRaw && typeof vRaw?.status === "string" ? String(vRaw.status) : null;
            await supabase.from("email_senders").update({
              sendgrid_sender_id: id ?? null,
              verified: isVerified,
              status: providerStatus,
            }).eq("id", sender.id);
            if (isVerified) {
              return new Response(JSON.stringify({ ok: true, alreadyVerified: true, relinked: true }), {
                status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
              });
            }
            // not verified -> send verification
            const resp2 = await fetch(`https://api.sendgrid.com/v3/senders/${id}/resend_verification`, {
              method: "POST",
              headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
            });
            if (!resp2.ok) {
              const t2 = await resp2.text();
              console.error("email-resend-verification: resend after relink failed", resp2.status, t2);
              return new Response(JSON.stringify({ error: "SendGrid error", details: t2 }), {
                status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
              });
            }
            return new Response(JSON.stringify({ ok: true, relinked: true }), {
              status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
        }
      } catch { /* ignore */ }
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
        // Try relink
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
              const id = match.id ?? match.sender_id;
              const vRaw = match?.verified;
              let isVerified = false;
              if (typeof vRaw === "boolean") isVerified = vRaw;
              else if (vRaw && typeof vRaw?.status === "string") {
                const s = String(vRaw.status).toLowerCase();
                isVerified = s === "verified" || s === "completed" || s === "true";
              }
              const providerStatus = vRaw && typeof vRaw?.status === "string" ? String(vRaw.status) : null;
              await supabase.from("email_senders").update({
                sendgrid_sender_id: id ?? null,
                verified: isVerified,
                status: providerStatus,
              }).eq("id", sender.id);
              if (isVerified) {
                return new Response(JSON.stringify({ ok: true, alreadyVerified: true, relinked: true }), {
                  status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
                });
              }
              const resp2 = await fetch(`https://api.sendgrid.com/v3/senders/${id}/resend_verification`, {
                method: "POST",
                headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
              });
              if (!resp2.ok) {
                const t2 = await resp2.text();
                console.error("email-resend-verification: resend after relink failed", resp2.status, t2);
                return new Response(JSON.stringify({ error: "SendGrid error", details: t2 }), {
                  status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
                });
              }
              return new Response(JSON.stringify({ ok: true, relinked: true }), {
                status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
              });
            }
          }
        } catch { /* ignore */ }
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
