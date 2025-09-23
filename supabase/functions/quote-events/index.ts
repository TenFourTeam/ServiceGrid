
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";
import { withRateLimit, RATE_LIMITS, getClientIP, RequestValidator } from "../_lib/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
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
  const ip = getClientIP(req);
  const userAgent = req.headers.get("user-agent");
  
  console.log(`🔍 [quote-events] ${req.method} from IP: ${ip}`);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting - 20 requests per minute per IP for event tracking
  const rateLimitResponse = withRateLimit("quote-events", RATE_LIMITS.EVENT_TRACKING, corsHeaders)(req);
  if (rateLimitResponse) {
    console.warn(`🚫 [quote-events] Rate limited IP: ${ip}`);
    return rateLimitResponse;
  }
  
  // Enhanced origin validation
  const origin = req.headers.get("Origin") || req.headers.get("origin");
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const originError = RequestValidator.validateOrigin(req, allowed);
  if (originError) {
    console.warn(`🚫 [quote-events] ${originError} from IP: ${ip}`);
    return okJSON({ error: originError }, 403);
  }

  // Detect suspicious patterns
  const warnings = RequestValidator.detectSuspiciousPatterns(userAgent, ip);
  if (warnings.length > 0) {
    console.warn(`⚠️ [quote-events] Suspicious request from ${ip}: ${warnings.join(", ")}`);
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || url.searchParams.get("action");
    const quote_id = url.searchParams.get("quote_id");
    const token = url.searchParams.get("token");

    if (!type || !quote_id || !token) {
      console.warn(`🚫 [quote-events] Missing required params from IP: ${ip}`);
      return okJSON({ error: "Missing required params: type, quote_id, token" }, 400);
    }

    // Validate parameters 
    if (!['open', 'approve', 'edit'].includes(type)) {
      console.warn(`🚫 [quote-events] Invalid event type: ${type} from IP: ${ip}`);
      return okJSON({ error: "Invalid event type" }, 400);
    }

    // Basic UUID validation for quote_id
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(quote_id)) {
      console.warn(`🚫 [quote-events] Invalid quote_id format from IP: ${ip}`);
      return okJSON({ error: "Invalid quote ID format" }, 400);
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

    if (type === "approve" || type === "edit") {
      // Validate quote and token
      const { data: q, error: qErr } = await supabase
        .from("quotes")
        .select("id,status,public_token,number,customer_id,businesses(name,logo_url),customers(email,name)")
        .eq("id", quote_id)
        .single();

      if (qErr) {
        console.error('quotes fetch error:', qErr);
      }

      const qToken = q?.public_token;
      if (!q || qToken !== token) {
        console.warn(`🚫 [quote-events] Invalid token for quote ${quote_id} from IP: ${ip}`);
        return html(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Invalid Link</title><style>body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;background:#f6f9fc;color:#0f172a}</style></head><body><div style="max-width:720px;margin:0 auto"><div style="background:#0f172a;color:#fff;border-radius:12px 12px 0 0;padding:20px 24px"><strong>Quote Action</strong></div><div style="background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;padding:24px"><div style="font-size:18px;font-weight:700;margin:0 0 8px">Invalid or expired link</div><p style="color:#475569;margin:0">Please contact the sender for a new email.</p></div><div style="color:#64748b;font-size:12px;text-align:center;margin-top:16px">Powered by Supabase Edge Functions</div></div></body></html>`, 400);
      }

      const already = ["Approved", "Edits Requested", "Declined"].includes(q.status);
      if (!already) {
        const newStatus = type === "approve" ? "Approved" : "Edits Requested";
        const { error: upErr } = await supabase
          .from("quotes")
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq("id", quote_id);
        if (upErr) console.error("quotes update error:", upErr);

        // Handle subscription creation for approved quotes
        if (type === "approve" && q.is_subscription) {
          console.log("Quote is a subscription, creating Stripe subscription...");
          
          try {
            // Call the manage-quote-subscription function
            const subscriptionResponse = await supabase.functions.invoke('manage-quote-subscription', {
              body: { quoteId: quote_id }
            });

            if (subscriptionResponse.error) {
              console.error("Failed to create subscription:", subscriptionResponse.error);
              // Don't fail the approval, just log the error
            } else {
              console.log("Subscription created successfully:", subscriptionResponse.data);
            }
          } catch (subscriptionError) {
            console.error("Error creating subscription:", subscriptionError);
            // Don't fail the approval, just log the error
          }
        } else if (type === "approve") {
          // For non-subscription quotes, create a regular unscheduled work order
          console.log("Creating unscheduled work order for approved quote...");
          
          try {
            const { error: jobError } = await supabase
              .from('jobs')
              .insert({
                owner_id: q.owner_id,
                business_id: q.business_id,
                customer_id: q.customer_id,
                quote_id: quote_id,
                title: `${q.number} - Service`,
                address: q.address,
                status: 'Scheduled',
                total: q.total,
                job_type: 'scheduled',
                is_clocked_in: false,
                is_recurring: false
              });

            if (jobError) {
              console.error("Failed to create work order:", jobError);
            } else {
              console.log("Work order created successfully");
            }
          } catch (jobErr) {
            console.error("Error creating work order:", jobErr);
          }
        }

        // Send follow-up email requesting details when edits are requested
        if (type === "edit") {
          const custEmail = q?.customers?.email as string | null;
          const custName = q?.customers?.name as string | null;
          const businessName = q?.businesses?.name as string | null;
          const businessLogoUrl = q?.businesses?.logo_url as string | null;
          const quoteNumber = q?.number as string | null;
          try {
            const resendApiKey = Deno.env.get("RESEND_API_KEY");
            const fromEmail = Deno.env.get("RESEND_FROM_EMAIL");
            if (resendApiKey && fromEmail && custEmail) {
              const resend = new Resend(resendApiKey);
              const from = businessName ? `${businessName} <${fromEmail}>` : fromEmail;
              const subject = `We received your edit request for Quote ${quoteNumber ?? ""}`.trim();
              const safeName = custName || "there";
              const header = businessLogoUrl ? `<div style=\"padding:12px 16px; background:#111827; border-radius:8px 8px 0 0\"><img src=\"${businessLogoUrl}\" alt=\"${(businessName || 'Business').replace(/"/g, '&quot;')} logo\" style=\"height:24px; display:block; border-radius:4px\" /></div>` : '';
              const html = `
                <div style="font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial; color:#111827; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden">
                  ${header}
                  <div style="padding:16px">
                    <p>Hi ${safeName},</p>
                    <p>Thanks for requesting edits to Quote ${quoteNumber ?? ""}. Please reply to this email with the details of the changes you’d like and we’ll update the quote right away.</p>
                    <p>Best regards,<br/>${businessName || "Our Team"}</p>
                  </div>
                </div>
              `;
              await resend.emails.send({ from, to: [custEmail], subject, html });
            }
          } catch (e) {
            console.error("follow-up email error:", e);
          }
        }
      }

      const commonHead = `
        <!doctype html>
        <html lang="en">
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>${type === "approve" ? "Quote Approved" : "Edit Request Recorded"}</title>
            <style>
              :root { --bg:#f6f9fc; --card:#ffffff; --border:#e5e7eb; --ink:#0f172a; --muted:#475569; --primary:#0f172a; }
              body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; padding: 24px; color: var(--ink); background: var(--bg); }
              .wrap { max-width: 720px; margin: 0 auto; }
              .hdr { background: var(--primary); color: #fff; border-radius: 12px 12px 0 0; padding: 20px 24px; }
              .card { background: var(--card); border: 1px solid var(--border); border-top: 0; border-radius: 0 0 12px 12px; padding: 24px; }
              .title { font-size: 18px; font-weight: 700; margin: 0 0 8px; }
              .desc { color: var(--muted); margin: 0; }
              .foot { color: #64748b; font-size: 12px; text-align: center; margin-top: 16px; }
              .icon { display:inline-block; width:18px; height:18px; border-radius:999px; background:${type === "approve" ? "#16a34a" : "#f59e0b"}; margin-right:8px; vertical-align:-3px; }
            </style>
          </head>
          <body>
            <div class="wrap">
              <div class="hdr"><strong>Quote Action</strong></div>
              <div class="card">
                <div class="title"><span class="icon"></span>${already ? "This action was already recorded." : (type === "approve" ? "Thanks! Your approval has been recorded." : "Thanks! Your edit request has been recorded.")}</div>
                <p class="desc">${already ? "You can safely close this page now." : (type === "approve" ? "You can safely close this page now." : "We’ll reach out shortly to confirm the changes you’d like.")}</p>
              </div>
              <div class="foot">Powered by Supabase Edge Functions</div>
            </div>
          </body>
        </html>
      `;
      return html(commonHead);
    }

    console.log(`🔍 [quote-events] Event processed: ${type} for quote ${quote_id} from IP: ${ip}`);
    return okJSON({ ok: true });
  } catch (err: unknown) {
    console.error("quote-events error:", err);
    return okJSON({ error: (err as Error)?.message || "Unexpected error" }, 500);
  }
});
