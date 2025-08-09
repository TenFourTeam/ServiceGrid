
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

interface SetupPayload {
  from_email: string;
  from_name?: string;
  reply_to?: string;
  address: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const payload = (await req.json()) as SetupPayload;
    const { from_email, from_name, reply_to, address, address2, city, state, zip, country } = payload;

    if (!from_email || !address || !city || !state || !zip || !country) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Upsert our local sender row
    const upsertRow = {
      user_id: user.id,
      provider: "sendgrid",
      from_email,
      from_name: from_name ?? null,
      reply_to: reply_to ?? null,
    };

    const { data: existing, error: selErr } = await supabase
      .from("email_senders")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (selErr) {
      console.error("email-setup-sendgrid: select error", selErr);
    }

    const { data: upserted, error: upErr } = await supabase
      .from("email_senders")
      .upsert(upsertRow, { onConflict: "user_id" })
      .select()
      .single();

    if (upErr || !upserted) {
      console.error("email-setup-sendgrid: upsert error", upErr);
      return new Response(JSON.stringify({ error: "Failed to save sender" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Create or update Single Sender in SendGrid
    const body = {
      nickname: "App Sender",
      from: { email: from_email, name: from_name || "Sender" },
      reply_to: { email: reply_to || from_email, name: from_name || "Sender" },
      address,
      address_2: address2 || "",
      city,
      state,
      zip,
      country,
    };

    const sgUrl = existing?.sendgrid_sender_id
      ? `https://api.sendgrid.com/v3/senders/${existing.sendgrid_sender_id}`
      : "https://api.sendgrid.com/v3/senders";

    const method = existing?.sendgrid_sender_id ? "PATCH" : "POST";

    const sgResp = await fetch(sgUrl, {
      method,
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await sgResp.text();
    let sgJson: any = {};
    try {
      sgJson = text ? JSON.parse(text) : {};
    } catch (_e) {
      // ignore
    }

    if (!sgResp.ok) {
      console.error("email-setup-sendgrid: sendgrid error", sgResp.status, text);
      return new Response(JSON.stringify({ error: "SendGrid error", details: text }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

  const senderId: number | undefined =
      existing?.sendgrid_sender_id ?? sgJson?.id ?? sgJson?.sender_id ?? undefined;

  // Compute strict verified status from SendGrid response
  const sgVerifiedRaw = sgJson?.verified;
  let computedVerified = false;
  if (typeof sgVerifiedRaw === "boolean") {
    computedVerified = sgVerifiedRaw;
  } else if (sgVerifiedRaw && typeof sgVerifiedRaw?.status === "string") {
    const s = String(sgVerifiedRaw.status).toLowerCase();
    computedVerified = s === "verified" || s === "completed" || s === "true";
  }
  let providerStatus = sgVerifiedRaw && typeof sgVerifiedRaw?.status === "string" ? String(sgVerifiedRaw.status) : null;

  // If user changed the from_email, force unverified and set pending status
  if (existing?.from_email && existing.from_email !== from_email) {
    computedVerified = false;
    if (!providerStatus) providerStatus = "pending";
  }

  const { error: updErr, data: updatedRow } = await supabase
    .from("email_senders")
    .update({
      sendgrid_sender_id: senderId ?? null,
      verified: computedVerified,
      status: providerStatus,
    })
    .eq("id", upserted.id)
    .select()
    .single();

    if (updErr) {
      console.error("email-setup-sendgrid: update error", updErr);
    }

    // For safety, attempt to trigger verification email if not verified yet
    if (senderId && !computedVerified) {
      await fetch(`https://api.sendgrid.com/v3/senders/${senderId}/resend_verification`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
      }).catch((e) => console.warn("resend_verification failed", e));
    }

    return new Response(
      JSON.stringify({
        ok: true,
        senderId: senderId ?? null,
        verified: !!computedVerified,
        row: updatedRow ?? upserted,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("email-setup-sendgrid error", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
