
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
      if (sgResp.status === 404) {
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

    // Strict verification check (robust)
    const sgVerifiedRaw = sgJson?.verified;
    const sgIsVerifiedFlag = sgJson?.is_verified === true;
    const sgVerificationStatus = typeof sgJson?.verification_status === "string"
      ? String(sgJson.verification_status).toLowerCase()
      : null;

    let verified = false;
    if (typeof sgVerifiedRaw === "boolean") {
      verified = sgVerifiedRaw;
    } else if (typeof sgVerifiedRaw === "string") {
      verified = sgVerifiedRaw.toLowerCase() === "true";
    } else if (sgVerifiedRaw && typeof sgVerifiedRaw?.status === "string") {
      const s = String(sgVerifiedRaw.status).toLowerCase();
      verified = s === "verified" || s === "completed" || s === "approved" || s === "true";
    }
    if (!verified && (sgIsVerifiedFlag || ["approved","verified","completed","success","true"].includes(sgVerificationStatus || ""))) {
      verified = true;
    }

    // If not verified, attempt reconciliation: find a verified sender for this user/from_email and relink
    if (!verified) {
      try {
        const userPrefix = `WB-${user.id.substring(0,8).toUpperCase()}`;
        const listResp = await fetch("https://api.sendgrid.com/v3/senders", {
          headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
        });
        const listText = await listResp.text();
        let listJson: any[] = [];
        try { listJson = listText ? JSON.parse(listText) : []; } catch { /* ignore */ }
        if (listResp.ok && Array.isArray(listJson)) {
          const normalize = (v: any) => (typeof v === 'string' ? v.toLowerCase().trim() : '');
          const fromEmailTarget = normalize(sender.from_email);

          const appSenders = listJson.filter((s: any) =>
            typeof s?.nickname === 'string' && s.nickname.startsWith(userPrefix + '-')
          );
          const sameEmail = appSenders.filter((s: any) =>
            normalize(s?.from?.email ?? s?.from_email) === fromEmailTarget
          );

          const isSgVerified = (obj: any): boolean => {
            if (!obj) return false;
            if (obj.is_verified === true) return true;
            const v = obj.verified;
            if (typeof v === 'boolean') return v;
            if (typeof v === 'string') return v.toLowerCase() === 'true';
            const st = typeof v?.status === 'string' ? v.status.toLowerCase() : (typeof obj.verification_status === 'string' ? obj.verification_status.toLowerCase() : null);
            return st === 'approved' || st === 'verified' || st === 'completed' || st === 'success' || st === 'true';
          };

          const verifiedCandidates = sameEmail.filter(isSgVerified);
          if (verifiedCandidates.length > 0) {
            // Choose the candidate with the largest numeric id
            verifiedCandidates.sort((a: any, b: any) => (Number(b.id ?? b.sender_id ?? 0) - Number(a.id ?? a.sender_id ?? 0)));
            const chosen = verifiedCandidates[0];
            const chosenId = chosen.id ?? chosen.sender_id;
            if (chosenId) {
              await supabase
                .from('email_senders')
                .update({ sendgrid_sender_id: chosenId, verified: true, status: 'verified' })
                .eq('id', sender.id);

              // Cleanup extras for this user
              for (const s of appSenders) {
                const sid = s.id ?? s.sender_id;
                if (!sid || sid === chosenId) continue;
                try { await fetch(`https://api.sendgrid.com/v3/senders/${sid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` } }); } catch { /* ignore */ }
              }

              return new Response(JSON.stringify({ ok: true, verified: true, relinked: true }), {
                status: 200,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              });
            }
          }
        }
      } catch (e) {
        console.warn('email-sender-status: reconciliation failed', e);
      }
    }

    await supabase
      .from("email_senders")
      .update({
        verified,
        status:
          (typeof sgJson?.verification_status === "string"
            ? String(sgJson.verification_status).toLowerCase()
            : (sgJson?.verified && typeof sgJson.verified?.status === "string"
                ? String(sgJson.verified.status).toLowerCase()
                : (verified ? "verified" : "pending"))),
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
