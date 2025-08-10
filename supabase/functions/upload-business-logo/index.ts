
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json", ...corsHeaders },
    ...init,
  });
}

async function getClerkPayload(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing Bearer token" } as const;
  }
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const secretKey = Deno.env.get("CLERK_SECRET_KEY");
  if (!secretKey) return { error: "Missing CLERK_SECRET_KEY" } as const;
  try {
    const payload = await verifyToken(token, { secretKey });
    return { payload } as const;
  } catch (e) {
    return { error: `Invalid token: ${e}` } as const;
  }
}

function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing Supabase env vars");
  return createClient(url, serviceKey);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  // Enforce allowed origins from ALLOWED_ORIGINS
  const origin = req.headers.get("Origin") || req.headers.get("origin");
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (origin && allowed.length && !allowed.includes("*") && !allowed.includes(origin)) {
    return json({ error: "Origin not allowed" }, { status: 403 });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { payload, error } = await getClerkPayload(req);
    if (error || !payload) return json({ error: error || "Unauthorized" }, { status: 401 });

    const supabase = createAdminClient();
    const clerkSub = (payload as any).sub as string;

    // Resolve owner_id from profiles by clerk_user_id (fallback: by email)
    let { data: profByClerk, error: profErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("clerk_user_id", clerkSub)
      .limit(1)
      .maybeSingle();
    if (profErr) throw profErr;

    let ownerId: string | null = profByClerk?.id as string | null;

    if (!ownerId) {
      const email = (payload as any)?.email as string | undefined;
      if (email) {
        const { data: profByEmail, error: profByEmailErr } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email.toLowerCase())
          .limit(1)
          .maybeSingle();
        if (profByEmailErr) throw profByEmailErr;
        ownerId = profByEmail?.id || null;
      }
    }

    if (!ownerId) {
      return json({ error: "Unable to resolve user profile" }, { status: 401 });
    }

    // Determine which icon to update from query string: ?kind=light|dark (default: dark)
    const url = new URL(req.url);
    const kind = url.searchParams.get("kind")?.toLowerCase() === "light" ? "light" : "dark";

    const form = await req.formData();
    const file = (form.get("file") as File | null) || (form.get("logo") as File | null);
    if (!file) return json({ error: "Missing file" }, { status: 400 });

    const type = (file.type || "").toLowerCase();
    const allowed = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/svg+xml"];
    if (!allowed.includes(type)) {
      return json({ error: "Unsupported file type" }, { status: 400 });
    }

    const ext =
      type.includes("png") ? "png" :
      type.includes("jpeg") || type.includes("jpg") ? "jpg" :
      type.includes("webp") ? "webp" :
      type.includes("gif") ? "gif" :
      type.includes("svg") ? "svg" : "bin";
    const path = `${ownerId}/logo-${kind}-${Date.now()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    // Upload to Storage
    const { error: upErr } = await supabase.storage.from("business-logos").upload(path, bytes, {
      contentType: type || "application/octet-stream",
      upsert: true,
    });
    if (upErr) throw upErr;

    // Get public URL
    const { data: pub } = supabase.storage.from("business-logos").getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    // Find or create default business for owner
    let { data: biz, error: bErr } = await supabase
      .from("businesses")
      .select("id")
      .eq("owner_id", ownerId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (bErr) throw bErr;

    if (!biz?.id) {
      const { data: ins, error: insErr } = await supabase
        .from("businesses")
        .insert({ name: "My Business", owner_id: ownerId })
        .select("id")
        .single();
      if (insErr) throw insErr;
      biz = ins;
    }

    // Update the correct column based on kind
    const updateData = kind === "light" ? { light_logo_url: publicUrl } : { logo_url: publicUrl };
    const { error: updErr } = await supabase
      .from("businesses")
      .update(updateData)
      .eq("id", biz.id);
    if (updErr) throw updErr;

    return json({ url: publicUrl, kind });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
});

