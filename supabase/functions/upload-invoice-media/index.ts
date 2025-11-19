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
    const { userId, businessId, supaAdmin: admin } = await requireCtx(req);

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return json({ error: "Missing file" }, { status: 400 });
    }

    // Get optional metadata
    const contentHash = form.get("contentHash") as string | null;
    const exifData = form.get("exif") ? JSON.parse(form.get("exif") as string) : null;
    const gpsData = form.get("gps") ? JSON.parse(form.get("gps") as string) : null;

    const contentType = (file as File).type || "";
    
    console.log('[upload-invoice-media] File type:', contentType, 'File name:', (file as File).name);
    
    // Support images and PDFs for invoice scanning
    const supportedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
      'image/heic', 'image/heif', 'application/pdf'
    ];
    
    if (!supportedTypes.includes(contentType)) {
      console.error('[upload-invoice-media] Unsupported file type:', contentType);
      return json({ 
        error: `Unsupported file type: ${contentType}. Supported formats: JPEG, PNG, WebP, HEIC, PDF` 
      }, { status: 415 });
    }

    // Validate size (10MB max for invoices)
    const maxMb = 10;
    const maxBytes = maxMb * 1024 * 1024;
    const size = (file as File).size ?? 0;
    
    if (size > maxBytes) {
      return json({ error: `File too large. Max ${maxMb}MB` }, { status: 413 });
    }

    // Check for duplicate content hash
    if (contentHash) {
      const { data: existing } = await admin
        .from('sg_media')
        .select('*')
        .eq('content_hash', contentHash)
        .eq('business_id', businessId)
        .is('job_id', null)
        .is('conversation_id', null)
        .is('checklist_item_id', null)
        .single();
      
      if (existing) {
        console.log('[upload-invoice-media] Duplicate content hash found, returning existing media');
        return json({ 
          url: existing.public_url, 
          path: existing.storage_path,
          mediaId: existing.id,
          isDuplicate: true 
        });
      }
    }

    // Generate storage path
    const origName = (file as File).name || "upload";
    const nameExt = origName.includes('.') ? origName.split('.').pop() || '' : '';
    const extByType: Record<string, string> = { 
      "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", 
      "image/heic":"heic", "image/heif":"heif", "application/pdf":"pdf"
    };
    const ext = extByType[contentType] || (nameExt || "bin");
    const key = `${userId}/invoices/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

    // Upload to job-media bucket (reuse existing bucket)
    const { error: upErr } = await admin.storage.from('job-media').upload(key, file, { 
      cacheControl: '3600', 
      upsert: false, 
      contentType 
    });
    
    if (upErr) {
      console.error('[upload-invoice-media] Storage upload error:', upErr);
      return json({ error: upErr.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = admin.storage.from('job-media').getPublicUrl(key);
    const publicUrl = urlData.publicUrl;

    // Create sg_media record (no job_id, conversation_id, or checklist_item_id)
    const { data: mediaRecord, error: dbErr } = await admin
      .from('sg_media')
      .insert({
        business_id: businessId,
        user_id: userId,
        file_type: contentType.startsWith('image/') ? 'photo' : 'document',
        mime_type: contentType,
        original_filename: origName,
        file_size: size,
        content_hash: contentHash,
        storage_path: key,
        public_url: publicUrl,
        metadata: {
          exif: exifData || {},
          gps: gpsData || {},
          upload_source: 'invoice_scan'
        }
      })
      .select()
      .single();

    if (dbErr) {
      console.error('[upload-invoice-media] Database insert error:', dbErr);
      // Cleanup uploaded file
      await admin.storage.from('job-media').remove([key]);
      return json({ error: dbErr.message }, { status: 500 });
    }

    console.log('[upload-invoice-media] Upload successful:', mediaRecord.id);

    return json({ 
      url: publicUrl, 
      path: key,
      mediaId: mediaRecord.id 
    });

  } catch (error) {
    console.error('[upload-invoice-media] Unexpected error:', error);
    return json({ 
      error: error instanceof Error ? error.message : "Upload failed" 
    }, { status: 500 });
  }
});
