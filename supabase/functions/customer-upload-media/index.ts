import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';
import { corsHeaders } from '../_shared/cors.ts';
import { crypto } from 'https://deno.land/std@0.224.0/crypto/mod.ts';

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/svg+xml'];
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

interface CustomerSession {
  customer_id: string;
  customer_name: string;
  business_id: string;
}

async function validateSessionToken(supabase: any, sessionToken: string): Promise<CustomerSession | null> {
  const { data: session, error } = await supabase
    .from('customer_sessions')
    .select(`
      id,
      expires_at,
      customer_account:customer_accounts!customer_sessions_customer_account_id_fkey (
        id,
        customer:customers!customer_accounts_customer_id_fkey (
          id,
          name,
          business_id
        )
      )
    `)
    .eq('session_token', sessionToken)
    .gte('expires_at', new Date().toISOString())
    .single();

  if (error || !session) {
    console.log('[customer-upload-media] Session validation failed:', error?.message);
    return null;
  }

  const customer = session.customer_account?.customer;
  if (!customer) {
    console.log('[customer-upload-media] No customer found for session');
    return null;
  }

  return {
    customer_id: customer.id,
    customer_name: customer.name,
    business_id: customer.business_id,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate session token
    const sessionToken = req.headers.get('x-session-token');
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Session token required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const session = await validateSessionToken(supabase, sessionToken);
    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { customer_id, business_id } = session;

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
    let duplicateQuery = supabase
      .from('sg_media')
      .select('id, public_url, thumbnail_url, file_size, mime_type')
      .eq('business_id', business_id)
      .eq('content_hash', contentHash);
    
    if (conversationId) {
      duplicateQuery = duplicateQuery.eq('conversation_id', conversationId);
    }
    
    const { data: existingMedia, error: dupError } = await duplicateQuery.maybeSingle();
    
    if (dupError) {
      console.warn('[customer-upload-media] Deduplication check failed (non-blocking):', dupError.message);
    }

    if (existingMedia) {
      console.log('[customer-upload-media] Duplicate media found:', existingMedia.id);
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

    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = crypto.randomUUID().slice(0, 8);
    const ext = file.name.split('.').pop() || (isImage ? 'jpg' : 'mp4');
    const filename = `${timestamp}-${randomStr}.${ext}`;
    const storagePath = `${business_id}/customer-${customer_id}/${filename}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('conversation-media')
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('[customer-upload-media] Storage upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('conversation-media')
      .getPublicUrl(storagePath);

    // For SVG, use public URL as thumbnail
    const thumbnailUrl = file.type === 'image/svg+xml' ? publicUrl : undefined;

    // Create media record
    const { data: mediaRecord, error: insertError } = await supabase
      .from('sg_media')
      .insert({
        business_id,
        conversation_id: conversationId,
        file_type: fileType,
        mime_type: file.type,
        original_filename: file.name,
        file_size: file.size,
        content_hash: contentHash,
        storage_path: storagePath,
        public_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        metadata: { uploaded_by_customer: customer_id },
        upload_status: 'completed'
      })
      .select()
      .single();

    if (insertError) {
      console.error('[customer-upload-media] Database insert error:', insertError);
      // Clean up uploaded file
      await supabase.storage.from('conversation-media').remove([storagePath]);
      return new Response(JSON.stringify({ error: 'Failed to create media record' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Trigger background processing
    if (file.type !== 'image/svg+xml') {
      if (isImage) {
        supabase.functions.invoke('process-media-thumbnail', {
          body: { mediaId: mediaRecord.id }
        }).catch(err => console.error('Thumbnail processing failed:', err));
      } else if (isVideo) {
        supabase.functions.invoke('transcode-media-video', {
          body: { mediaId: mediaRecord.id }
        }).catch(err => console.error('Video transcoding failed:', err));
      }
    }

    console.log(`[customer-upload-media] Media uploaded: ${mediaRecord.id}`);

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
    console.error('[customer-upload-media] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
