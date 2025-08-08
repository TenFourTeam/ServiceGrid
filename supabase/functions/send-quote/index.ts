
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY") as string);

interface SendQuotePayload {
  to: string;
  subject: string;
  html: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, subject, html } = (await req.json()) as SendQuotePayload;

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log("send-quote: received request", { to, subject, html_length: html.length });

    const sendResp = await resend.emails.send({
      from: "Quotes <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      // You can set a reply_to later to your verified domain address for better deliverability
      // reply_to: "support@yourdomain.com",
      tags: [{ name: "app", value: "quotes" }],
    });

    if ((sendResp as any)?.error) {
      console.error("send-quote: Resend error", (sendResp as any).error);
      return new Response(
        JSON.stringify({ ok: false, error: (sendResp as any).error?.message || "Failed to send email", details: (sendResp as any).error }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("send-quote: email sent", (sendResp as any)?.data);

    return new Response(JSON.stringify({ ok: true, id: (sendResp as any)?.data?.id, data: (sendResp as any)?.data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("send-quote error", err);
    return new Response(JSON.stringify({ error: err?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
