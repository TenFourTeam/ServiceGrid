// Deno Edge Function: verifies Clerk token and returns basic identity
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  // Enforce allowed origins from ALLOWED_ORIGINS
  const origin = req.headers.get("Origin") || req.headers.get("origin");
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (origin && allowed.length && !allowed.includes("*") && !allowed.includes(origin)) {
    return json({ error: "Origin not allowed" }, { status: 403 });
  }

  try {
    const { userId, clerkUserId, email, businessId } = await requireCtx(req);

    return json({
      ok: true,
      user_id: clerkUserId,
      user_uuid: userId,
      email: email,
      business_id: businessId,
    });
  } catch (e) {
    return json({ error: String(e) }, { status: 401 });
  }
});
