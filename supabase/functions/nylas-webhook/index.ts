import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nylas-signature",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing Supabase environment variables");
}

const supabase = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);

async function hmacSha256Hex(secret: string, body: ArrayBuffer): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, body);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface NylasEventData {
  id?: string;
  object?: string;
  [key: string]: unknown;
}

interface NylasEventEnvelope {
  type?: string; // e.g. "message.created"
  data?: NylasEventData;
  [key: string]: unknown;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("challenge");

    // Nylas webhook verification (GET with ?challenge=...)
    if (req.method === "GET") {
      if (challenge) {
        console.log("Responding to Nylas challenge");
        return new Response(challenge, { headers: { "Content-Type": "text/plain", ...corsHeaders } });
      }
      return new Response("OK", { headers: { "Content-Type": "text/plain", ...corsHeaders } });
    }

    // Only POST beyond this point
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: { ...corsHeaders } });
    }

    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.warn("WEBHOOK_SECRET not set - rejecting webhook POST");
      return new Response(JSON.stringify({ error: "WEBHOOK_SECRET not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Read raw body for signature verification
    const rawBody = await req.arrayBuffer();
    const nylasSignature = req.headers.get("x-nylas-signature") || req.headers.get("X-Nylas-Signature");

    if (!nylasSignature) {
      console.warn("Missing X-Nylas-Signature header");
      return new Response("Unauthorized", { status: 401, headers: { ...corsHeaders } });
    }

    const digest = await hmacSha256Hex(webhookSecret, rawBody);
    const isValid = digest === nylasSignature.toLowerCase();

    if (!isValid) {
      console.warn("Invalid webhook signature", { digest });
      return new Response("Unauthorized", { status: 401, headers: { ...corsHeaders } });
    }

    // Parse JSON body now that signature is validated
    const text = new TextDecoder().decode(rawBody);
    let payload: any;
    try {
      payload = JSON.parse(text);
    } catch (e) {
      console.error("Failed to parse webhook payload JSON", e);
      return new Response("Bad Request", { status: 400, headers: { ...corsHeaders } });
    }

    // Normalize to an array of events
    const events: NylasEventEnvelope[] = Array.isArray(payload?.events)
      ? payload.events
      : (payload ? [payload] : []);

    let processed = 0;

    for (const evt of events) {
      const type = evt?.type || evt?.event || ""; // be permissive
      const data = evt?.data as NylasEventData | undefined;

      // We only care about message.created for now
      if (type === "message.created" && data?.id) {
        const providerMessageId = String(data.id);
        console.log("message.created received", { providerMessageId });

        // Update mail_sends rows that match this provider_message_id and are pending
        const { data: upd, error: updErr } = await supabase
          .from("mail_sends")
          .update({ status: "sent" })
          .eq("provider_message_id", providerMessageId)
          .eq("status", "pending")
          .select("id");

        if (updErr) {
          console.error("Failed to update mail_sends", updErr);
        } else {
          processed += upd?.length || 0;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error) {
    console.error("Unhandled error in nylas-webhook", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
