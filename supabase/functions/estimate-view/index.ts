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

interface ViewRequest { token: string }

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { token } = (await req.json()) as ViewRequest;
    if (!token) {
      return new Response(JSON.stringify({ error: "token is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch snapshot by token
    const { data: row, error } = await supabaseAdmin
      .from("estimate_public_snapshots")
      .select("id, snapshot, view_count")
      .eq("token", token)
      .maybeSingle();

    if (error || !row) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Increment view_count best-effort
    const newCount = (row.view_count ?? 0) + 1;
    await supabaseAdmin
      .from("estimate_public_snapshots")
      .update({ view_count: newCount, viewed_at: new Date().toISOString() })
      .eq("id", row.id);

    const snapshot = row.snapshot as any;
    const businessName = snapshot?.businessName as string | undefined;
    const canonicalSlug = snapshot?.canonicalSlug || slugify(businessName || "");

    return new Response(JSON.stringify({ snapshot, slug: canonicalSlug }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (e: any) {
    console.error("estimate-view error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
