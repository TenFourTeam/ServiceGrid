
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@2.0.0";

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  // Enforce allowed origins on CORS/fetch requests only (allow direct navigation)
  const origin = req.headers.get("Origin") || req.headers.get("origin");
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (origin && allowed.length && !allowed.includes("*") && !allowed.includes(origin)) {
    return okJSON({ error: "Origin not allowed" }, 403);
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

    if (type === "approve" || type === "edit") {
      // Validate quote and token
      const { data: q, error: qErr } = await supabase
        .from("quotes")
        .select("id,status,public_token,number,customer_id,is_active,is_subscription,businesses(name,logo_url),customers(email,name)")
        .eq("id", quote_id)
        .single();

      if (qErr) {
        console.error('quotes fetch error:', qErr);
      }

      const qToken = (q as any)?.public_token;
      if (!q || qToken !== token) {
        return html(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Invalid Link</title><style>body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;padding:24px;background:#f6f9fc;color:#0f172a}</style></head><body><div style="max-width:720px;margin:0 auto"><div style="background:#0f172a;color:#fff;border-radius:12px 12px 0 0;padding:20px 24px"><strong>Quote Action</strong></div><div style="background:#fff;border:1px solid #e5e7eb;border-top:0;border-radius:0 0 12px 12px;padding:24px"><div style="font-size:18px;font-weight:700;margin:0 0 8px">Invalid or expired link</div><p style="color:#475569;margin:0">Please contact the sender for a new email.</p></div><div style="color:#64748b;font-size:12px;text-align:center;margin-top:16px">Powered by Supabase Edge Functions</div></div></body></html>`, 400);
      }

      // Check if quote is still active
      if (!(q as any).is_active) {
        console.log("Quote has been superseded");
        const supersededHTML = `
          <!DOCTYPE html>
          <html>
            <head><title>Quote Superseded</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h1>Quote No Longer Available</h1>
              <p>This quote has been superseded by a newer version. Please contact the business for the latest quote.</p>
            </body>
          </html>
        `;
        return html(supersededHTML);
      }

      const already = ["Approved", "Edits Requested", "Declined"].includes((q as any).status);
      if (!already) {
        // Check for existing active subscription before approving
        if (type === "approve" && (q as any).is_subscription) {
          const { data: hasActiveSub, error: activeSubError } = await supabase.rpc(
            'has_active_subscription',
            {
              p_customer_id: (q as any).customer_id,
              p_business_id: (q as any).business_id
            }
          );

          if (activeSubError) {
            console.error("Error checking active subscription:", activeSubError);
            return html(`<h1>Error</h1><p>Failed to process subscription.</p>`);
          }

          if (hasActiveSub) {
            console.log("Customer already has active subscription");
            const existingSubHTML = `
              <!DOCTYPE html>
              <html>
                <head><title>Subscription Already Active</title></head>
                <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                  <h1>Subscription Already Active</h1>
                  <p>You already have an active subscription for this service. Please contact the business to modify your existing subscription.</p>
                </body>
              </html>
            `;
            return html(existingSubHTML);
          }
        }

        const newStatus = type === "approve" ? "Approved" : "Edits Requested";
        const { error: upErr } = await supabase
          .from("quotes")
          .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
          .eq("id", quote_id);
        if (upErr) console.error("quotes update error:", upErr);

        // Handle subscription creation for approved quotes
        if (type === "approve" && (q as any).is_subscription) {
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
                owner_id: (q as any).owner_id,
                business_id: (q as any).business_id,
                customer_id: (q as any).customer_id,
                quote_id: quote_id,
                title: `${(q as any).number} - Service`,
                address: (q as any).address,
                status: 'Scheduled',
                total: (q as any).total,
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
          const custEmail = (q as any)?.customers?.email as string | null;
          const custName = (q as any)?.customers?.name as string | null;
          const businessName = (q as any)?.businesses?.name as string | null;
          const businessLogoUrl = (q as any)?.businesses?.logo_url as string | null;
          const quoteNumber = (q as any)?.number as string | null;
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

    return okJSON({ ok: true });
  } catch (err: any) {
    console.error("quote-events error:", err);
    return okJSON({ error: err?.message || "Unexpected error" }, 500);
  }
});
