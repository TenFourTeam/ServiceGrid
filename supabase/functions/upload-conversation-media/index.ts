import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/cors.ts';
import { requireCtx } from '../_lib/auth.ts';
import * as exifr from 'https://esm.sh/exifr@7.1.3';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/svg+xml'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const { businessId } = ctx;

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string | null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
    const isVideo = SUPPORTED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      return new Response(JSON.stringify({ error: `Unsupported file type: ${file.type}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum size is 100MB' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const fileType = isImage ? 'photo' : 'video';
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Calculate content hash for deduplication
    const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const contentHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check for duplicate
    let duplicateQuery = ctx.supaAdmin
      .from('sg_media')
      .select('id, public_url, thumbnail_url, file_size, mime_type')
      .eq('business_id', businessId)
      .eq('content_hash', contentHash);
    
    if (conversationId) {
      duplicateQuery = duplicateQuery.eq('conversation_id', conversationId);
    } else {
      duplicateQuery = duplicateQuery.is('conversation_id', null);
    }
    
    const { data: existingMedia } = await duplicateQuery.maybeSingle();

    if (existingMedia) {
      console.log('Duplicate media found, returning existing:', existingMedia.id);
      return new Response(JSON.stringify({
        mediaId: existingMedia.id,
        url: existingMedia.public_url,
        thumbnailUrl: existingMedia.thumbnail_url,
        fileSize: existingMedia.file_size,
        mimeType: existingMedia.mime_type,
        isDuplicate: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Extract EXIF data for images (skip for SVG)
    let metadata: any = {};
    if (isImage && file.type !== 'image/svg+xml') {
      try {
        const exifData = await exifr.parse(bytes);
        if (exifData) {
          metadata.exif = exifData;
          if (exifData.latitude && exifData.longitude) {
            metadata.gps = {
              latitude: exifData.latitude,
              longitude: exifData.longitude
            };
          }
        }
      } catch (error) {
        console.warn('EXIF extraction failed:', error);
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = crypto.randomUUID().slice(0, 8);
    const ext = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
    const filename = `${timestamp}-${randomStr}.${ext}`;
    const storagePath = `${businessId}/${conversationId}/${filename}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await ctx.supaAdmin.storage
      .from('conversation-media')
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file', details: uploadError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get public URL
    const { data: { publicUrl } } = ctx.supaAdmin.storage
      .from('conversation-media')
      .getPublicUrl(storagePath);

    // For SVG, use public URL as thumbnail
    const thumbnailUrl = file.type === 'image/svg+xml' ? publicUrl : undefined;

    // Create media record
    const { data: mediaRecord, error: insertError } = await ctx.supaAdmin
      .from('sg_media')
      .insert({
        business_id: businessId,
        conversation_id: conversationId,
        user_id: ctx.userId,
        file_type: fileType,
        mime_type: file.type,
        original_filename: file.name,
        file_size: file.size,
        content_hash: contentHash,
        storage_path: storagePath,
        public_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        metadata,
        upload_status: file.type === 'image/svg+xml' ? 'completed' : 'processing'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Clean up uploaded file
      await ctx.supaAdmin.storage.from('conversation-media').remove([storagePath]);
      return new Response(JSON.stringify({ error: 'Failed to create media record', details: insertError }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Trigger background processing for photos (except SVG) and videos
    if (file.type !== 'image/svg+xml') {
      if (isImage) {
        ctx.supaAdmin.functions.invoke('process-media-thumbnail', {
          body: { mediaId: mediaRecord.id }
        }).catch(err => console.error('Thumbnail processing failed:', err));
      } else if (isVideo) {
        ctx.supaAdmin.functions.invoke('transcode-media-video', {
          body: { mediaId: mediaRecord.id }
        }).catch(err => console.error('Video transcoding failed:', err));
      }
    }

    return new Response(JSON.stringify({
      mediaId: mediaRecord.id,
      url: publicUrl,
      thumbnailUrl: thumbnailUrl,
      fileSize: file.size,
      mimeType: file.type,
      isDuplicate: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
