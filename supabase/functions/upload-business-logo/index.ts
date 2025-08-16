
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

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
    const { userId: ownerId, supaAdmin: supabase } = await requireCtx(req);

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

