// Bootstrap user profile + default business, and send welcome email on first sign-in
// Auth: Bearer Clerk token; CORS with allowed origins
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

function withCors(headers: HeadersInit = {}) {
  return { ...corsHeaders, ...(headers as Record<string, string>) };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: withCors() });
  }

  // Enforce allowed origins if configured
  const origin = req.headers.get("Origin") || req.headers.get("origin") || "";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (origin && allowed.length && !allowed.includes("*") && !allowed.includes(origin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed" }), {
      status: 403,
      headers: withCors({ "Content-Type": "application/json" }),
    });
  }

  try {
    const auth = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!auth || !auth.toLowerCase().startsWith("bearer ")) {
      return new Response(JSON.stringify({ error: "Missing bearer token" }), {
        status: 401,
        headers: withCors({ "Content-Type": "application/json" }),
      });
    }

    const token = auth.split(" ")[1];
    const secretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Missing CLERK_SECRET_KEY" }), {
        status: 500,
        headers: withCors({ "Content-Type": "application/json" }),
      });
    }

    // Verify Clerk token
    const payload = await verifyToken(token, { secretKey });
    const clerkUserId = (payload as any)?.sub as string | undefined;
    const emailFromToken = (payload as any)?.email as string | undefined;
    if (!clerkUserId) {
      return new Response(JSON.stringify({ error: "Invalid Clerk token" }), {
        status: 401,
        headers: withCors({ "Content-Type": "application/json" }),
      });
    }

    // Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase config" }), {
        status: 500,
        headers: withCors({ "Content-Type": "application/json" }),
      });
    }
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1) Ensure profiles mapping exists
    let createdProfile = false;
    let updatedProfile = false;
    let profileId: string | null = null;
    let email: string | null = emailFromToken || null;

    // Try by clerk_user_id
    {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, clerk_user_id")
        .eq("clerk_user_id", clerkUserId)
        .maybeSingle();
      if (data?.id) {
        profileId = data.id as string;
        email = (data.email as string) || email;
      }
    }

    // Try by email if not found
    if (!profileId && email) {
      const { data } = await supabase
        .from("profiles")
        .select("id, email, clerk_user_id")
        .eq("email", email)
        .maybeSingle();
      if (data?.id) {
        profileId = data.id as string;
        if (!data.clerk_user_id) {
          await supabase.from("profiles").update({ clerk_user_id: clerkUserId }).eq("id", data.id);
          updatedProfile = true;
        }
      }
    }

    // Fallback: create profile
    if (!profileId) {
      // If email not in token, try Clerk Users API
      if (!email) {
        const resp = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
          headers: { Authorization: `Bearer ${secretKey}` },
        });
        if (resp.ok) {
          const j = await resp.json();
          email = j?.email_addresses?.find((e: any) => e?.verification?.status === "verified")?.email_address || j?.primary_email_address_id || j?.email_addresses?.[0]?.email_address || null;
        }
      }
      const newId = crypto.randomUUID();
      const insert = { id: newId, email: email || "", clerk_user_id: clerkUserId } as any;
      const { error: insErr } = await supabase.from("profiles").insert(insert);
      if (insErr) throw insErr;
      profileId = newId;
      createdProfile = true;
    }

    // 2) Ensure a default business exists
    let createdBusiness = false;
    if (profileId) {
      const { data: existingBiz } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", profileId)
        .limit(1)
        .maybeSingle();
      if (!existingBiz?.id) {
        const { error: bizErr } = await supabase
          .from("businesses")
          .insert({ owner_id: profileId, name: "My Business" });
        if (bizErr) throw bizErr;
        createdBusiness = true;
      }
    }

    // 3) Send welcome email once
    let sentWelcome = false;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "team@tenfourproject.com";
    if (resendApiKey && profileId && email) {
      const subject = "Welcome to ServiceGrid";
      const { data: already } = await supabase
        .from("mail_sends")
        .select("id")
        .eq("user_id", profileId)
        .eq("subject", subject)
        .limit(1)
        .maybeSingle();
      if (!already?.id) {
        try {
          const resend = new Resend(resendApiKey);
          const html = `
            <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica Neue, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; line-height: 1.6; color: #111827;">
              <h2 style="margin:0 0 12px;">Welcome to ServiceGrid</h2>
              <p style="margin:0 0 12px;">We're excited to have you on board. Your workspace has been set up.</p>
              <p style="margin:0 0 12px;">You can start by creating a quote or scheduling a job.</p>
              <p style="margin:24px 0 0; font-size:12px; color:#6b7280;">If you didn't sign up for this, you can ignore this email.</p>
            </div>`;
          const res = await resend.emails.send({
            from: `ServiceGrid Team <${fromEmail}>`,
            to: [email],
            subject,
            html,
          });
          await supabase.from("mail_sends").insert({
            user_id: profileId,
            to_email: email,
            subject,
            status: "sent",
            provider_message_id: (res as any)?.data?.id || null,
          });
          sentWelcome = true;
        } catch (e) {
          await supabase.from("mail_sends").insert({
            user_id: profileId,
            to_email: email,
            subject,
            status: "failed",
            error_message: String(e?.message || e),
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, profileId, createdProfile, updatedProfile, createdBusiness, sentWelcome }),
      { status: 200, headers: withCors({ "Content-Type": "application/json" }) }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: withCors({ "Content-Type": "application/json" }),
    });
  }
});
