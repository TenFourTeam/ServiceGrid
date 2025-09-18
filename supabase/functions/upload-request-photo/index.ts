import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { userId, supaAdmin: admin } = await requireCtx(req);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return json({ error: "Missing file" }, { status: 400 });
    }

    // Validate type and size
    const allowedTypes = ["image/jpeg","image/png","image/webp","image/heic","image/heif"];
    const maxMb = parseInt(Deno.env.get("REQUEST_PHOTO_MAX_MB") || "10", 10);
    const maxBytes = isFinite(maxMb) ? maxMb * 1024 * 1024 : 10 * 1024 * 1024;

    const contentType = (file as File).type || "application/octet-stream";
    if (!allowedTypes.includes(contentType)) {
      return json({ error: "Unsupported file type" }, { status: 415 });
    }
    const size = (file as File).size ?? 0;
    if (size > maxBytes) {
      return json({ error: `File too large. Max ${maxMb}MB` }, { status: 413 });
    }

    const origName = (file as File).name || "upload";
    const nameExt = origName.includes('.') ? origName.split('.').pop() || '' : '';
    const extByType: Record<string, string> = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "image/heic":"heic", "image/heif":"heif" };
    const ext = extByType[contentType] || (nameExt || "bin");
    const key = `${userId}/requests/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

    // Upload to storage bucket
    const { error: upErr } = await admin.storage.from('request-photos').upload(key, file, { cacheControl: '3600', upsert: false, contentType });
    if (upErr) {
      return json({ error: upErr.message }, { status: 500 });
    }

    const { data: pub } = admin.storage.from('request-photos').getPublicUrl(key);
    const url = pub?.publicUrl;
    if (!url) {
      return json({ error: 'Failed to get public URL' }, { status: 500 });
    }

    return json({ url, path: key });
  } catch (e: any) {
    console.error('[upload-request-photo] error', e);
    return json({ error: e?.message || String(e) }, { status: 500 });
  }
});