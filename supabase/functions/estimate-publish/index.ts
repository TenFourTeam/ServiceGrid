import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function slugify(input: string): string {
  if (!input) return "business";
  return input
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "business";
}

interface PublishRequest {
  estimate_id: string;
  customer_email?: string;
  // Arbitrary snapshot used by the public page to render the quote
  snapshot: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const body = (await req.json()) as PublishRequest;
    if (!body?.estimate_id || !body?.snapshot) {
      return new Response(JSON.stringify({ error: "estimate_id and snapshot are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Ensure snapshot contains the canonical business slug for convenience (optional)
    const businessName = (body.snapshot as any)?.businessName as string | undefined;
    const canonicalSlug = slugify(businessName || "");

    const insertRes = await supabaseAdmin
      .from("estimate_public_snapshots")
      .insert({
        estimate_id: body.estimate_id,
        customer_email: body.customer_email ?? null,
        snapshot: { ...body.snapshot, canonicalSlug },
      })
      .select("token")
      .maybeSingle();

    if (insertRes.error || !insertRes.data) {
      console.error("insert snapshot error", insertRes.error);
      return new Response(JSON.stringify({ error: insertRes.error?.message || "Insert failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(JSON.stringify({ token: insertRes.data.token, slug: canonicalSlug }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("estimate-publish error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
