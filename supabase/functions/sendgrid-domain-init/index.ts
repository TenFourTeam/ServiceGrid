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

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) console.error("sendgrid-domain-init: Missing Supabase env");
if (!SENDGRID_API_KEY) console.error("sendgrid-domain-init: Missing SENDGRID_API_KEY secret");

interface InitBody {
  domain?: string;
  email?: string;
  from_name?: string;
  from_email?: string;
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

    const body: InitBody = await req.json().catch(() => ({} as InitBody));
    const domainRaw = body.domain || (body.email && body.email.split("@")[1]);
    if (!domainRaw) {
      return new Response(JSON.stringify({ error: "Missing domain or email" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const domain = String(domainRaw).trim().toLowerCase();

    // Check if we already have a record
    const { data: existing, error: selErr } = await supabase
      .from("email_domains")
      .select("id, sendgrid_id, status, dns_records, default_from_email, default_from_name")
      .eq("user_id", userId)
      .eq("domain", domain)
      .maybeSingle();
    if (selErr) console.log("select email_domains err", selErr);

    let sendgridId = existing?.sendgrid_id as number | undefined;
    let dnsRecords = existing?.dns_records as any;

    if (!sendgridId) {
      // Create a new authenticated domain in SendGrid
      const res = await fetch("https://api.sendgrid.com/v3/whitelabel/domains", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SENDGRID_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain,
          subdomain: "mail",
          automatic_security: true,
          custom_spf: true,
          default: false,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error("sendgrid create domain error", err);
        return new Response(JSON.stringify({ error: "SendGrid error creating domain", details: err }), {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      const json = await res.json();
      sendgridId = json?.id;
      dnsRecords = json?.dns;
    }

    // Upsert local record
    const { data: upserted, error: upErr } = await supabase
      .from("email_domains")
      .upsert(
        {
          user_id: userId,
          domain,
          status: "pending",
          sendgrid_id: sendgridId,
          dns_records: dnsRecords ?? null,
          default_from_email: body.from_email || existing?.default_from_email || null,
          default_from_name: body.from_name || existing?.default_from_name || null,
        },
        { onConflict: "user_id,domain" }
      )
      .select()
      .maybeSingle();

    if (upErr) {
      console.error("upsert email_domains err", upErr);
      return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    return new Response(JSON.stringify({
      domain,
      sendgrid_id: sendgridId,
      dns_records: upserted?.dns_records || dnsRecords || [],
      status: upserted?.status || "pending",
    }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e: any) {
    console.error("sendgrid-domain-init error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});