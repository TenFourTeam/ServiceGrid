
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Transparent 1x1 PNG (base64)
const PIXEL_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";
const PIXEL_BYTES = Uint8Array.from(atob(PIXEL_BASE64), (c) => c.charCodeAt(0));

function okJSON(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

function html(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", ...corsHeaders },
  });
}

function pixel() {
  return new Response(PIXEL_BYTES, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      ...corsHeaders,
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || url.searchParams.get("action");
    const quote_id = url.searchParams.get("quote_id");
    const token = url.searchParams.get("token");

    if (!type || !quote_id || !token) {
      return okJSON({ error: "Missing required params: type, quote_id, token" }, 400);
    }

    const meta = {
      ua: req.headers.get("user-agent") || undefined,
      ip:
        req.headers.get("x-forwarded-for") ||
        req.headers.get("cf-connecting-ip") ||
        undefined,
      ref: req.headers.get("referer") || undefined,
    };

    const { error } = await supabase.from("quote_events").insert({
      quote_id,
      token,
      type,
      meta,
    });

    if (error) {
      console.error("quote_events insert error:", error);
    }

    if (type === "open") {
      // return a tracking pixel
      return pixel();
    }

    if (type === "approve") {
      return html(`
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>Quote Approved</title>
            <style>
              body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; }
              .card { max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
              .title { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
              .desc { color: #475569; margin: 0; }
              .foot { color: #64748b; font-size: 12px; text-align: center; margin-top: 16px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="title">Thanks! Your approval has been recorded.</div>
              <p class="desc">You can safely close this page now.</p>
            </div>
            <div class="foot">This page is powered by Supabase Edge Functions.</div>
          </body>
        </html>
      `);
    }

    if (type === "edit") {
      return html(`
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>Edit Request Recorded</title>
            <style>
              body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: #0f172a; }
              .card { max-width: 560px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
              .title { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
              .desc { color: #475569; margin: 0; }
              .foot { color: #64748b; font-size: 12px; text-align: center; margin-top: 16px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="title">Thanks! Your edit request has been recorded.</div>
              <p class="desc">We’ll reach out shortly to confirm the changes you’d like.</p>
            </div>
            <div class="foot">This page is powered by Supabase Edge Functions.</div>
          </body>
        </html>
      `);
    }

    return okJSON({ ok: true });
  } catch (err: any) {
    console.error("quote-events error:", err);
    return okJSON({ error: err?.message || "Unexpected error" }, 500);
  }
});
