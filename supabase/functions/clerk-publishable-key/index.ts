// Deno Edge Function: returns the Clerk publishable key (public)
// CORS-enabled, no auth required, rate limited
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { withRateLimit, RATE_LIMITS, getClientIP, RequestValidator } from "../_lib/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

serve(async (req) => {
  const ip = getClientIP(req);
  const userAgent = req.headers.get("user-agent");
  
  console.log(`🔍 [clerk-publishable-key] ${req.method} from IP: ${ip}`);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Apply rate limiting - 60 requests per minute for public API (auth flows can be frequent)
  const rateLimitResponse = withRateLimit("clerk-publishable-key", RATE_LIMITS.PUBLIC_API, corsHeaders)(req);
  if (rateLimitResponse) {
    console.warn(`🚫 [clerk-publishable-key] Rate limited IP: ${ip}`);
    return rateLimitResponse;
  }

  // Enhanced origin validation
  const origin = req.headers.get("Origin") || req.headers.get("origin");
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const originError = RequestValidator.validateOrigin(req, allowed);
  if (originError) {
    console.warn(`🚫 [clerk-publishable-key] ${originError} from IP: ${ip}`);
    return new Response(JSON.stringify({ error: originError }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Detect suspicious patterns
  const warnings = RequestValidator.detectSuspiciousPatterns(userAgent, ip);
  if (warnings.length > 0) {
    console.warn(`⚠️ [clerk-publishable-key] Suspicious request from ${ip}: ${warnings.join(", ")}`);
  }

  try {
    const publishableKey = Deno.env.get("CLERK_PUBLISHABLE_KEY") ?? "";

    if (!publishableKey) {
      console.error(`🚫 [clerk-publishable-key] Missing CLERK_PUBLISHABLE_KEY for request from IP: ${ip}`);
      return new Response(JSON.stringify({ error: "Missing CLERK_PUBLISHABLE_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`✅ [clerk-publishable-key] Key delivered to IP: ${ip}`);
    return new Response(JSON.stringify({ publishableKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(`🚫 [clerk-publishable-key] Error for IP ${ip}:`, e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
