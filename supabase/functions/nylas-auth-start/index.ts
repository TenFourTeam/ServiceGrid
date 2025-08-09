
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
const NYLAS_CLIENT_ID = Deno.env.get("NYLAS_CLIENT_ID") as string;
const CLERK_SECRET_KEY = Deno.env.get("CLERK_SECRET_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("nylas-auth-start: Missing Supabase env");
}
if (!NYLAS_CLIENT_ID) {
  console.error("nylas-auth-start: Missing NYLAS_CLIENT_ID");
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    let loginEmail = "";

    const { data: auth } = await supabase.auth.getUser(token);
    if (auth?.user?.email) {
      loginEmail = auth.user.email;
    } else if (CLERK_SECRET_KEY) {
      try {
        const payload: any = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
        loginEmail = payload.email || payload.email_address || "";
      } catch (e) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    const { redirect_uri }: { redirect_uri?: string } = await req.json().catch(() => ({}));
    const redirect = redirect_uri || `${req.headers.get("origin") || ""}/nylas/callback`;

    // Minimal scope for sending
    const scopes = encodeURIComponent("email.send");
    const clientId = encodeURIComponent(NYLAS_CLIENT_ID);
    const redirectParam = encodeURIComponent(redirect);
    const loginHint = encodeURIComponent(loginEmail);

    const url = `https://api.us.nylas.com/v3/connect/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectParam}&scopes=${scopes}&login_hint=${loginHint}`;

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("nylas-auth-start error", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
