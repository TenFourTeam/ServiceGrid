
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") as string;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;
const NYLAS_API_KEY = Deno.env.get("NYLAS_API_KEY") as string;
const NYLAS_CLIENT_ID = Deno.env.get("NYLAS_CLIENT_ID") as string;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("nylas-exchange-code: Missing Supabase env");
}
if (!NYLAS_API_KEY || !NYLAS_CLIENT_ID) {
  console.error("nylas-exchange-code: Missing Nylas secrets");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const accessToken = authHeader.replace("Bearer ", "");
    if (!accessToken) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: auth, error: userErr } = await supabase.auth.getUser(accessToken);
    if (userErr || !auth?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { code, redirect_uri }: { code?: string; redirect_uri?: string } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ error: "Missing code" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const tokenResp = await fetch("https://api.us.nylas.com/v3/connect/token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NYLAS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: NYLAS_CLIENT_ID,
        code,
        grant_type: "authorization_code",
        ...(redirect_uri ? { redirect_uri } : {}),
      }),
    });

    const tokenText = await tokenResp.text();
    let tokenJson: any = {};
    try { tokenJson = tokenText ? JSON.parse(tokenText) : {}; } catch {}
    if (!tokenResp.ok) {
      console.error("nylas-exchange-code: token error", tokenResp.status, tokenText);
      return new Response(JSON.stringify({ error: "Nylas token exchange failed", details: tokenText }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const grantId: string | undefined = tokenJson?.grant_id || tokenJson?.grantId || tokenJson?.id;
    const emailFromToken: string | undefined = tokenJson?.email || tokenJson?.profile?.email || tokenJson?.grant?.profile?.email || tokenJson?.grant?.profile?.email_address;

    if (!grantId) {
      return new Response(JSON.stringify({ error: "Missing grant_id from Nylas response" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    // Best effort fetch grant details to get mailbox address if not present
    let mailboxEmail = emailFromToken ?? auth.user.email ?? "";
    try {
      const gResp = await fetch(`https://api.us.nylas.com/v3/grants/${grantId}`, {
        headers: { Authorization: `Bearer ${NYLAS_API_KEY}` },
      });
      const gText = await gResp.text();
      let gJson: any = {};
      try { gJson = gText ? JSON.parse(gText) : {}; } catch {}
      const grantEmail = gJson?.profile?.email || gJson?.profile?.email_address || gJson?.email;
      if (grantEmail) mailboxEmail = grantEmail;
    } catch (e) {
      console.warn("nylas-exchange-code: grant fetch warn", e);
    }

    // Upsert sender config
    const upsertRow: any = {
      user_id: auth.user.id,
      provider: "nylas",
      from_email: mailboxEmail || auth.user.email,
      from_name: null,
      reply_to: mailboxEmail || auth.user.email,
      nylas_grant_id: grantId,
      verified: true,
      status: "connected",
      sendgrid_sender_id: null,
    };

    const { data: upserted, error: upErr } = await supabase
      .from("email_senders")
      .upsert(upsertRow, { onConflict: "user_id" })
      .select()
      .single();

    if (upErr) {
      console.error("nylas-exchange-code: upsert error", upErr);
      return new Response(JSON.stringify({ error: "Failed to save sender" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({ ok: true, grant_id: grantId, sender: upserted }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("nylas-exchange-code error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
