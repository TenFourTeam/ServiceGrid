import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { verifyToken } from "https://esm.sh/@clerk/backend@1.3.2";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || req.headers.get("origin") || "*";
  const allowed = (Deno.env.get("ALLOWED_ORIGINS") || "").split(",").map(s => s.trim()).filter(Boolean);
  const allowOrigin = allowed.length === 0 || allowed.includes("*") || allowed.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "*",
    "Vary": "Origin",
    "Content-Type": "application/json",
  } as Record<string, string>;
}

async function resolveOwnerId(admin: ReturnType<typeof createClient>, clerkUserId: string, email?: string) {
  // Try by clerk_user_id
  const { data: byClerk } = await admin
    .from("profiles")
    .select("id")
    .eq("clerk_user_id", clerkUserId)
    .limit(1);
  if (byClerk && byClerk.length) return byClerk[0].id as string;

  if (email) {
    const lower = email.toLowerCase();
    const { data: byEmail } = await admin
      .from("profiles")
      .select("id")
      .ilike("email", lower)
      .limit(1);
    if (byEmail && byEmail.length) return byEmail[0].id as string;
  }
  throw new Error("Profile not found for current user");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: getCorsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Bearer token" }), { status: 401, headers: getCorsHeaders(req) });
    }

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const secretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!secretKey) {
      return new Response(JSON.stringify({ error: "Missing CLERK_SECRET_KEY" }), { status: 500, headers: getCorsHeaders(req) });
    }

    const clerk = await verifyToken(token, { secretKey });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), { status: 400, headers: getCorsHeaders(req) });
    }

    // Validate type and size
    const allowedTypes = ["image/jpeg","image/png","image/webp","image/heic","image/heif"];
    const maxMb = parseInt(Deno.env.get("JOB_PHOTO_MAX_MB") || "10", 10);
    const maxBytes = isFinite(maxMb) ? maxMb * 1024 * 1024 : 10 * 1024 * 1024;

    const contentType = (file as File).type || "application/octet-stream";
    if (!allowedTypes.includes(contentType)) {
      return new Response(JSON.stringify({ error: "Unsupported file type" }), { status: 415, headers: getCorsHeaders(req) });
    }
    const size = (file as File).size ?? 0;
    if (size > maxBytes) {
      return new Response(JSON.stringify({ error: `File too large. Max ${maxMb}MB` }), { status: 413, headers: getCorsHeaders(req) });
    }

    const email = (clerk as any).email || (clerk as any).claims?.email;
    const ownerId = await resolveOwnerId(admin, clerk.sub, email);

    const origName = (file as File).name || "upload";
    const nameExt = origName.includes('.') ? origName.split('.').pop() || '' : '';
    const extByType: Record<string, string> = { "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "image/heic":"heic", "image/heif":"heif" };
    const ext = extByType[contentType] || (nameExt || "bin");
    const key = `${ownerId}/jobs/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

    // Upload to storage bucket
    const { error: upErr } = await admin.storage.from('job-photos').upload(key, file, { cacheControl: '3600', upsert: false, contentType });
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), { status: 500, headers: getCorsHeaders(req) });
    }

    const { data: pub } = admin.storage.from('job-photos').getPublicUrl(key);
    const url = pub?.publicUrl;
    if (!url) {
      return new Response(JSON.stringify({ error: 'Failed to get public URL' }), { status: 500, headers: getCorsHeaders(req) });
    }

    return new Response(JSON.stringify({ url, path: key }), { status: 200, headers: getCorsHeaders(req) });
  } catch (e: any) {
    console.error('[upload-job-photo] error', e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), { status: 500, headers: getCorsHeaders(req) });
  }
});
