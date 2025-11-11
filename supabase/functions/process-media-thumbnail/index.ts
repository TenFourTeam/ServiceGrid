import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  try {
    const { mediaId } = await req.json();
    
    if (!mediaId) {
      return new Response(JSON.stringify({ error: "Missing mediaId" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Fetch media record
    const { data: media, error: fetchError } = await supabase
      .from('sg_media')
      .select('*')
      .eq('id', mediaId)
      .single();
    
    if (fetchError || !media) {
      console.error('[process-media-thumbnail] Media not found:', fetchError);
      return new Response(JSON.stringify({ error: "Media not found" }), { status: 404 });
    }

    // Skip if thumbnail already exists
    if (media.thumbnail_url) {
      console.log('[process-media-thumbnail] Thumbnail already exists');
      return new Response(JSON.stringify({ message: "Thumbnail already exists" }), { status: 200 });
    }

    // Download original image
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('job-media')
      .download(media.storage_path);
    
    if (downloadError || !fileData) {
      console.error('[process-media-thumbnail] Download failed:', downloadError);
      return new Response(JSON.stringify({ error: "Failed to download original" }), { status: 500 });
    }

    // For now, we'll use a simple approach: re-upload at smaller size
    // In production, you'd use image processing library here
    const thumbnailPath = `${media.user_id}/${media.job_id}/thumb-${Date.now()}.webp`;
    
    // Upload thumbnail (using original for now - actual resizing would happen here)
    const { error: uploadError } = await supabase.storage
      .from('job-media-thumbnails')
      .upload(thumbnailPath, fileData, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('[process-media-thumbnail] Upload failed:', uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload thumbnail" }), { status: 500 });
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('job-media-thumbnails')
      .getPublicUrl(thumbnailPath);
    
    // Update sg_media record
    const { error: updateError } = await supabase
      .from('sg_media')
      .update({ thumbnail_url: publicData.publicUrl })
      .eq('id', mediaId);
    
    if (updateError) {
      console.error('[process-media-thumbnail] Update failed:', updateError);
      return new Response(JSON.stringify({ error: "Failed to update record" }), { status: 500 });
    }

    console.log('[process-media-thumbnail] Thumbnail generated successfully');
    return new Response(JSON.stringify({ 
      success: true, 
      thumbnailUrl: publicData.publicUrl 
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (e: any) {
    console.error('[process-media-thumbnail] Error:', e);
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
