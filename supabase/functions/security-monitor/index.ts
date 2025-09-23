import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { rateLimiter } from "../_lib/rate-limiter.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Security monitoring endpoint for rate limiter statistics
 * Requires authentication to access
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // This endpoint requires authentication - check for auth header
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Authentication required" }), 
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (req.method !== "GET") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }), 
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const stats = rateLimiter.getStats();
    const timestamp = new Date().toISOString();
    
    console.log(`📊 [security-monitor] Stats requested at ${timestamp}`);
    
    return new Response(
      JSON.stringify({
        timestamp,
        ratelimiter: stats,
        status: "healthy",
        uptime: Math.floor(performance.now() / 1000), // seconds since function start
      }), 
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
    
  } catch (error) {
    console.error("[security-monitor] Error:", error);
    
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        timestamp: new Date().toISOString()
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});