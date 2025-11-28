import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const form = await req.formData();
    const file = form.get("file");
    const businessId = form.get("businessId") as string;

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!businessId) {
      return new Response(JSON.stringify({ error: "Missing businessId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate that business exists
    const { data: business, error: businessError } = await admin
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .single();

    if (businessError || !business) {
      console.error('[public-upload-request-photo] Business not found:', businessId);
      return new Response(JSON.stringify({ error: "Invalid business" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate type and size
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    const maxMb = parseInt(Deno.env.get("REQUEST_PHOTO_MAX_MB") || "10", 10);
    const maxBytes = isFinite(maxMb) ? maxMb * 1024 * 1024 : 10 * 1024 * 1024;

    const contentType = file.type || "application/octet-stream";
    if (!allowedTypes.includes(contentType)) {
      return new Response(JSON.stringify({ error: "Unsupported file type" }), {
        status: 415,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const size = file.size ?? 0;
    if (size > maxBytes) {
      return new Response(JSON.stringify({ error: `File too large. Max ${maxMb}MB` }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate file path
    const origName = file.name || "upload";
    const nameExt = origName.includes('.') ? origName.split('.').pop() || '' : '';
    const extByType: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/heic": "heic",
      "image/heif": "heif"
    };
    const ext = extByType[contentType] || (nameExt || "bin");
    const key = `${businessId}/public-requests/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // Upload to storage bucket
    const { error: upErr } = await admin.storage
      .from('request-photos')
      .upload(key, file, { cacheControl: '3600', upsert: false, contentType });

    if (upErr) {
      console.error('[public-upload-request-photo] Upload error:', upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pub } = admin.storage.from('request-photos').getPublicUrl(key);
    const url = pub?.publicUrl;

    if (!url) {
      return new Response(JSON.stringify({ error: 'Failed to get public URL' }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log('[public-upload-request-photo] Upload successful:', { businessId, key, url });

    return new Response(JSON.stringify({ url, path: key }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error('[public-upload-request-photo] error', e);
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
