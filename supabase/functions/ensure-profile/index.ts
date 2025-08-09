
/**
 * Supabase Edge Function: ensure-profile
 * - Authenticated users call this to ensure a row exists in public.profiles
 * - Uses service role to bypass RLS and upsert (id, email)
 * - Respects the unique index on lower(email); returns 409 on conflict with another user
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: "Missing Supabase env configuration" }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  // Identify the current authenticated user from the provided JWT
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  if (!user.email) {
    return new Response(JSON.stringify({ error: "User has no email" }), { status: 400, headers: corsHeaders });
  }

  // Try to upsert the profile for this user id.
  // This will:
  // - insert when missing
  // - update the email if the row already exists (same id)
  // It will fail with unique violation if another user has the same lower(email)
  const payload = { id: user.id, email: user.email };

  const { data: profile, error: upsertError } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select()
    .single();

  if (upsertError) {
    // Check for unique violation (duplicate email for a different user)
    const isUniqueViolation =
      typeof upsertError.message === "string" &&
      upsertError.message.toLowerCase().includes("duplicate key value violates unique constraint");

    const status = isUniqueViolation ? 409 : 500;

    return new Response(
      JSON.stringify({
        error: isUniqueViolation
          ? "A profile with this email already exists."
          : "Failed to upsert profile",
        details: upsertError.message ?? upsertError,
      }),
      { status, headers: corsHeaders },
    );
  }

  return new Response(JSON.stringify({ ok: true, profile }), { status: 200, headers: corsHeaders });
});
