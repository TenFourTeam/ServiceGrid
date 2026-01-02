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
      console.error('[transcode-media-video] Media not found:', fetchError);
      return new Response(JSON.stringify({ error: "Media not found" }), { status: 404 });
    }

    // Skip if HLS already exists
    if (media.hls_manifest_url) {
      console.log('[transcode-media-video] HLS already exists');
      return new Response(JSON.stringify({ message: "HLS already exists" }), { status: 200 });
    }

    console.log('[transcode-media-video] Video transcoding stub - not implemented yet');
    
    // TODO: Implement actual video transcoding to HLS
    // For MVP, we'll just mark as completed and use the original video URL
    // In production, this would:
    // 1. Download original video from job-media bucket
    // 2. Transcode to HLS format (multiple quality levels)
    // 3. Upload segments and manifest to job-media-hls bucket
    // 4. Update hls_manifest_url
    
    // For now, just log that we received the request
    const { error: updateError } = await supabase
      .from('sg_media')
      .update({ 
        upload_status: 'completed',
        metadata: {
          ...media.metadata,
          transcoding_note: 'Deferred - using original video'
        }
      })
      .eq('id', mediaId);
    
    if (updateError) {
      console.error('[transcode-media-video] Update failed:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Video transcoding deferred - using original" 
    }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (e: any) {
    console.error('[transcode-media-video] Error:', e);
    return new Response(JSON.stringify({ error: e.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
