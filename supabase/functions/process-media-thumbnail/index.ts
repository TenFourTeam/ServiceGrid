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

    // Determine which bucket to use based on media type
    const storageBucket = media.job_id ? 'job-media' : 'conversation-media';
    console.log(`[process-media-thumbnail] Using bucket: ${storageBucket}`);

    // Download original image
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(storageBucket)
      .download(media.storage_path);
    
    if (downloadError || !fileData) {
      console.error('[process-media-thumbnail] Download failed:', downloadError);
      // Mark as completed anyway so it's not stuck
      await supabase.from('sg_media').update({ upload_status: 'completed' }).eq('id', mediaId);
      return new Response(JSON.stringify({ error: "Failed to download original" }), { status: 500 });
    }

    // Generate thumbnail path based on media type
    const identifier = media.job_id || media.conversation_id || media.user_id;
    const thumbnailPath = `${media.user_id || media.business_id}/${identifier}/thumb-${Date.now()}.webp`;
    
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
    
    // Update sg_media record with thumbnail and mark as completed
    const { error: updateError } = await supabase
      .from('sg_media')
      .update({ 
        thumbnail_url: publicData.publicUrl,
        upload_status: 'completed'
      })
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
