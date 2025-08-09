
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
  nickname?: string;
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
    const { from_email, from_name, nickname, reply_to, address, address2, city, state, zip, country } = payload;

    if (!from_email || !reply_to || !address || !city || !state || !zip || !country) {
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

    // Decide whether to PATCH existing sender (if from_email unchanged) or POST a new one
    const safeFromName = from_name && from_name.trim().length > 0 ? from_name : from_email;
    const baseNickname = (nickname && nickname.trim().length > 0) ? nickname : safeFromName;
    const userPrefix = `WB-${user.id.substring(0,8).toUpperCase()}`;
    const uniqueNickname = `${userPrefix}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
    const safeReplyTo = reply_to;

    const isPatch = !!(existing?.sendgrid_sender_id && existing?.from_email === from_email);

    const sgUrl = isPatch
      ? `https://api.sendgrid.com/v3/senders/${existing!.sendgrid_sender_id}`
      : "https://api.sendgrid.com/v3/senders";

    let body: any = isPatch
      ? {
          // Do not change nickname on PATCH to avoid collisions
          from: { email: from_email, name: safeFromName },
          reply_to: { email: safeReplyTo, name: safeFromName },
          address,
          address_2: address2 || "",
          city,
          state,
          zip,
          country,
        }
      : {
          nickname: uniqueNickname,
          from: { email: from_email, name: safeFromName },
          reply_to: { email: safeReplyTo, name: safeFromName },
          address,
          address_2: address2 || "",
          city,
          state,
          zip,
          country,
        };

    const method = isPatch ? "PATCH" : "POST";

    let sgResp = await fetch(sgUrl, {
      method,
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    let text = await sgResp.text();
    let sgJson: any = {};
    try {
      sgJson = text ? JSON.parse(text) : {};
    } catch (_e) {
      // ignore
    }

    // Fallback: if updating an existing sender returns 404, try creating a new one
    if (!sgResp.ok && method === "PATCH" && sgResp.status === 404) {
      console.warn(
        "email-setup-sendgrid: existing sender not found on SendGrid (404). Retrying with POST to create a new sender."
      );
      const createResp = await fetch("https://api.sendgrid.com/v3/senders", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...body, nickname: uniqueNickname }),
      });

      const createText = await createResp.text();
      let createJson: any = {};
      try {
        createJson = createText ? JSON.parse(createText) : {};
      } catch (_e) {
        // ignore
      }

      if (!createResp.ok) {
        console.error("email-setup-sendgrid: create sender failed", createResp.status, createText);
        return new Response(
          JSON.stringify({ error: "SendGrid error", details: createText }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Use the creation response from now on
      sgResp = createResp;
      text = createText;
      sgJson = createJson;
    }

    if (!sgResp.ok) {
      // Handle duplicate nickname by retrying with a different nickname suffix (do NOT relink existing)
      const isDupNickname =
        sgResp.status === 400 &&
        ((Array.isArray(sgJson?.errors) && sgJson.errors.some((e: any) => /same nickname|already have a sender identity/i.test(String(e?.message || ""))))
         || /same nickname|already have a sender identity/i.test(text || ""));
      if (isDupNickname) {
        try {
          const retryNickname = `${baseNickname}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
          body = { ...body, nickname: retryNickname };
          const createResp = await fetch("https://api.sendgrid.com/v3/senders", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${SENDGRID_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          });
          const createText = await createResp.text();
          let createJson: any = {};
          try { createJson = createText ? JSON.parse(createText) : {}; } catch { /* ignore */ }
          if (!createResp.ok) {
            console.error("email-setup-sendgrid: duplicate nickname retry failed", createResp.status, createText);
            return new Response(JSON.stringify({ error: "SendGrid error", details: createText }), {
              status: 500,
              headers: { "Content-Type": "application/json", ...corsHeaders },
            });
          }
          // Use the retry creation response
          sgResp = createResp;
          text = createText;
          sgJson = createJson;
        } catch (e) {
          console.error("email-setup-sendgrid: error creating new sender after duplicate nickname", e);
          return new Response(JSON.stringify({ error: "SendGrid error", details: String(e) }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
      } else {
        console.error("email-setup-sendgrid: sendgrid error", sgResp.status, text);
        return new Response(JSON.stringify({ error: "SendGrid error", details: text }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

  const senderId: number | undefined = sgJson?.id ?? sgJson?.sender_id ?? undefined;

  // Compute strict verified status from SendGrid response
  const sgVerifiedRaw = sgJson?.verified;
  let computedVerified = false;
  if (typeof sgVerifiedRaw === "boolean") {
    computedVerified = sgVerifiedRaw;
  } else if (typeof sgVerifiedRaw === "string") {
    computedVerified = sgVerifiedRaw.toLowerCase() === "true";
  } else if (sgVerifiedRaw && typeof (sgVerifiedRaw as any)?.status === "string") {
    const s = String((sgVerifiedRaw as any).status).toLowerCase();
    computedVerified = s === "verified" || s === "completed" || s === "approved" || s === "true";
  }
  let providerStatus = sgVerifiedRaw && typeof (sgVerifiedRaw as any)?.status === "string" ? String((sgVerifiedRaw as any).status) : null;

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

    // Enforce "no extras allowed" for this user: delete other app-created senders
    try {
      const listResp = await fetch("https://api.sendgrid.com/v3/senders", {
        headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
      });
      const listText = await listResp.text();
      let listJson: any[] = [];
      try { listJson = listText ? JSON.parse(listText) : []; } catch { /* ignore */ }
      if (listResp.ok && Array.isArray(listJson)) {
        const toDelete = listJson.filter((s: any) =>
          typeof s?.nickname === "string" && s.nickname.startsWith(userPrefix + "-") && (s.id ?? s.sender_id) !== senderId
        );
        for (const s of toDelete) {
          const id = s.id ?? s.sender_id;
          if (!id) continue;
          try {
            await fetch(`https://api.sendgrid.com/v3/senders/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${SENDGRID_API_KEY}` },
            });
          } catch (e) {
            console.warn("email-setup-sendgrid: failed to delete extra sender", id, e);
          }
        }
      }
    } catch (e) {
      console.warn("email-setup-sendgrid: cleanup extras failed", e);
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
