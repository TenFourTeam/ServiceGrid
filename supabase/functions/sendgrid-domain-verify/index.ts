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

    const { domain }: { domain?: string } = await req.json().catch(() => ({}));
    if (!domain) return new Response(JSON.stringify({ error: "Missing domain" }), { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const { data: row, error: selErr } = await supabase
      .from("email_domains")
      .select("id, sendgrid_id")
      .eq("user_id", userId)
      .eq("domain", domain)
      .maybeSingle();
    if (selErr) return new Response(JSON.stringify({ error: selErr.message }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
    if (!row?.sendgrid_id) return new Response(JSON.stringify({ error: "No SendGrid domain found" }), { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } });

    const res = await fetch(`https://api.sendgrid.com/v3/whitelabel/domains/${row.sendgrid_id}/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    const json = await res.json();
    const valid = !!json?.valid;

    const { error: updErr } = await supabase
      .from("email_domains")
      .update({ status: valid ? "verified" : "pending", dns_records: json?.validation_results ?? null })
      .eq("id", row.id);
    if (updErr) console.log("update status err", updErr);

    return new Response(JSON.stringify({ valid, details: json }), { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } });
  } catch (e: any) {
    console.error("sendgrid-domain-verify error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
  }
});