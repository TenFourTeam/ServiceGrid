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

    // Get optional metadata from FormData
    const jobId = form.get("jobId") as string;
    const businessId = form.get("businessId") as string;
    const contentHash = form.get("contentHash") as string | null;
    const exifData = form.get("exif") ? JSON.parse(form.get("exif") as string) : null;
    const gpsData = form.get("gps") ? JSON.parse(form.get("gps") as string) : null;

    // Determine file type (photo or video)
    const contentType = (file as File).type || "";
    
    console.log('[upload-job-photo] File type:', contentType, 'File name:', (file as File).name);
    
    // Whitelist of supported MIME types
    const supportedImageTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 
      'image/heic', 'image/heif', 'image/svg+xml'
    ];
    const supportedVideoTypes = [
      'video/mp4', 'video/quicktime', 'video/x-msvideo', 
      'video/webm', 'video/mpeg'
    ];
    
    const isPhoto = supportedImageTypes.includes(contentType);
    const isVideo = supportedVideoTypes.includes(contentType);
    const isSvg = contentType === 'image/svg+xml';
    
    if (!isPhoto && !isVideo) {
      console.error('[upload-job-photo] Unsupported file type:', contentType);
      return json({ 
        error: `Unsupported file type: ${contentType}. Supported formats: JPEG, PNG, WebP, HEIC, SVG, MP4, MOV, AVI, WebM` 
      }, { status: 415 });
    }

    // Validate size based on type
    const photoMaxMb = parseInt(Deno.env.get("MEDIA_PHOTO_MAX_MB") || "10", 10);
    const videoMaxMb = parseInt(Deno.env.get("MEDIA_VIDEO_MAX_MB") || "500", 10);
    const maxMb = isPhoto ? photoMaxMb : videoMaxMb;
    const maxBytes = maxMb * 1024 * 1024;
    const size = (file as File).size ?? 0;
    
    if (size > maxBytes) {
      return json({ error: `File too large. Max ${maxMb}MB` }, { status: 413 });
    }

    // Check for duplicate content hash if provided
    if (contentHash && jobId) {
      const { data: existing } = await admin
        .from('sg_media')
        .select('*')
        .eq('content_hash', contentHash)
        .eq('job_id', jobId)
        .single();
      
      if (existing) {
        console.log('[upload-job-photo] Duplicate content hash found, returning existing media');
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
      "image/jpeg":"jpg", "image/png":"png", "image/webp":"webp", "image/heic":"heic", "image/heif":"heif", "image/svg+xml":"svg",
      "video/mp4":"mp4", "video/quicktime":"mov", "video/x-msvideo":"avi", "video/webm":"webm"
    };
    const ext = extByType[contentType] || (nameExt || "bin");
    const key = `${userId}/jobs/${Date.now()}-${Math.random().toString(36).slice(2,8)}.${ext}`;

    // Upload to job-media bucket (unified bucket for photos and videos)
    const { error: upErr } = await admin.storage.from('job-media').upload(key, file, { 
      cacheControl: '3600', 
      upsert: false, 
      contentType 
    });
    
    if (upErr) {
      return json({ error: upErr.message }, { status: 500 });
    }

    const { data: pub } = admin.storage.from('job-media').getPublicUrl(key);
    const url = pub?.publicUrl;
    if (!url) {
      return json({ error: 'Failed to get public URL' }, { status: 500 });
    }

    // Create sg_media record if jobId and businessId provided
    let mediaId: string | null = null;
    if (jobId && businessId) {
      const { data: mediaRecord, error: mediaErr } = await admin
        .from('sg_media')
        .insert({
          business_id: businessId,
          job_id: jobId,
          user_id: userId,
          file_type: isPhoto ? 'photo' : 'video',
          mime_type: contentType,
          original_filename: origName,
          file_size: size,
          content_hash: contentHash,
          storage_path: key,
          public_url: url,
          thumbnail_url: isSvg ? url : undefined,
          upload_status: 'completed',
          metadata: {
            exif: exifData,
            gps: gpsData
          }
        })
        .select('id')
        .single();
      
      if (mediaErr) {
        console.error('[upload-job-photo] Failed to create sg_media record:', mediaErr);
      } else {
        mediaId = mediaRecord.id;
        
        // Trigger background processing (non-blocking)
        if (isPhoto && !isSvg) {
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/process-media-thumbnail`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mediaId })
          }).catch(err => console.error('[upload-job-photo] Thumbnail trigger failed:', err));
        } else if (isVideo) {
          fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/transcode-media-video`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mediaId })
          }).catch(err => console.error('[upload-job-photo] Transcode trigger failed:', err));
        }
      }
    }

    return json({ url, path: key, mediaId });
  } catch (e: any) {
    console.error('[upload-job-photo] error', e);
    return json({ error: e?.message || String(e) }, { status: 500 });
  }
});
