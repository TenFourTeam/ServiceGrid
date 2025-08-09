import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
  if (!apiKey || !fromEmail) {
    return new Response(
      JSON.stringify({ error: "Email not configured", sender: null }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const resend = new Resend(apiKey);
  const fromDomain = (fromEmail.split("@")[1] || "").toLowerCase();

  try {
    const domainsRes = await (resend as any).domains.list();
    const domains = (domainsRes as any)?.data ?? [];
    const match = domains.find((d: any) => String(d?.name || '').toLowerCase() === fromDomain);
    const status = String(match?.status || 'unknown').toLowerCase();
    const verified = ["verified", "connected", "active", "ready", "sending"].includes(status);

    return new Response(
      JSON.stringify({
        sender: { from_email: fromEmail, provider: "resend", verified },
        domains,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    console.error("resend-health error", e);
    return new Response(
      JSON.stringify({
        sender: { from_email: fromEmail, provider: "resend", verified: false },
        error: e?.message || String(e),
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});