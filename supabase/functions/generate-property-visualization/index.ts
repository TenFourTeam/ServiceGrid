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

    const { 
      beforeMediaId, 
      prompt, 
      jobId, 
      style = 'realistic',
      numberOfVariations = 1 
    } = await req.json();

    // Validate inputs
    if (!beforeMediaId) {
      return json({ error: "beforeMediaId is required" }, { status: 400 });
    }
    if (!jobId) {
      return json({ error: "jobId is required" }, { status: 400 });
    }
    if (numberOfVariations < 1 || numberOfVariations > 4) {
      return json({ error: "numberOfVariations must be between 1 and 4" }, { status: 400 });
    }

    // Fetch the before photo from sg_media
    const { data: beforeMedia, error: mediaError } = await admin
      .from('sg_media')
      .select('*')
      .eq('id', beforeMediaId)
      .eq('business_id', businessId)
      .single();

    if (mediaError || !beforeMedia) {
      console.error('[generate-property-visualization] Before media not found:', mediaError);
      return json({ error: "Before photo not found" }, { status: 404 });
    }

    // Fetch job details for context
    const { data: job, error: jobError } = await admin
      .from('jobs')
      .select('title, notes, job_type')
      .eq('id', jobId)
      .eq('business_id', businessId)
      .single();

    if (jobError) {
      console.error('[generate-property-visualization] Job not found:', jobError);
      return json({ error: "Job not found" }, { status: 404 });
    }

    // Construct AI prompt based on job type and user description
    const systemPrompt = constructSystemPrompt(style);
    const userPrompt = constructUserPrompt(job, prompt, style);

    console.log('[generate-property-visualization] System prompt:', systemPrompt);
    console.log('[generate-property-visualization] User prompt:', userPrompt);

    // Call Lovable AI with google/gemini-3-pro-image-preview model
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('[generate-property-visualization] LOVABLE_API_KEY not configured');
      return json({ error: "AI service not configured" }, { status: 500 });
    }

    // Generate each variation
    const generatedVariations = [];
    
    for (let i = 0; i < numberOfVariations; i++) {
      console.log(`[generate-property-visualization] Generating variation ${i + 1}/${numberOfVariations}...`);

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-pro-image-preview",
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: userPrompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: beforeMedia.public_url
                  }
                }
              ]
            }
          ],
          modalities: ["image", "text"]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[generate-property-visualization] AI API error:', response.status, errorText);
        
        if (response.status === 429) {
          return json({ 
            error: "AI service rate limit exceeded. Please try again in a moment.",
            errorType: "RATE_LIMIT" 
          }, { status: 429 });
        }
        if (response.status === 402) {
          return json({ 
            error: "AI credits exhausted. Please add credits to continue.",
            errorType: "PAYMENT_REQUIRED"
          }, { status: 402 });
        }
        
        return json({ error: "AI generation failed", details: errorText }, { status: 500 });
      }

      const aiData = await response.json();
      console.log('[generate-property-visualization] AI response:', JSON.stringify(aiData).substring(0, 200));

      // Extract base64 image from response
      const generatedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (!generatedImageUrl) {
        console.error('[generate-property-visualization] No image in AI response');
        return json({ error: "AI did not generate an image" }, { status: 500 });
      }

      // Parse base64 data
      const base64Data = generatedImageUrl.replace(/^data:image\/\w+;base64,/, '');
      const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

      // Generate storage path
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).slice(2, 8);
      const storagePath = `${userId}/visualizations/${jobId}_${timestamp}_v${i + 1}_${randomId}.png`;

      // Upload to Supabase Storage
      const { error: uploadError } = await admin.storage
        .from('visualizations')
        .upload(storagePath, imageBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('[generate-property-visualization] Storage upload error:', uploadError);
        return json({ error: "Failed to store generated image", details: uploadError.message }, { status: 500 });
      }

      // Get public URL
      const { data: urlData } = admin.storage.from('visualizations').getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      // Create sg_media record
      const { data: mediaRecord, error: mediaRecordError } = await admin
        .from('sg_media')
        .insert({
          business_id: businessId,
          job_id: jobId,
          user_id: userId,
          file_type: 'photo',
          mime_type: 'image/png',
          original_filename: `visualization_v${i + 1}.png`,
          file_size: imageBuffer.length,
          storage_path: storagePath,
          public_url: publicUrl,
          upload_status: 'completed',
          generation_metadata: {
            source_media_id: beforeMediaId,
            prompt: prompt,
            style: style,
            model: 'google/gemini-3-pro-image-preview',
            variation_number: i + 1,
            generated_at: new Date().toISOString()
          }
        })
        .select()
        .single();

      if (mediaRecordError) {
        console.error('[generate-property-visualization] Failed to create media record:', mediaRecordError);
        // Clean up uploaded file
        await admin.storage.from('visualizations').remove([storagePath]);
        return json({ error: "Failed to save generated image", details: mediaRecordError.message }, { status: 500 });
      }

      generatedVariations.push({
        mediaId: mediaRecord.id,
        publicUrl: publicUrl,
        variationNumber: i + 1
      });
    }

    // Log to sg_ai_generations table
    const { error: logError } = await admin
      .from('sg_ai_generations')
      .insert({
        business_id: businessId,
        user_id: userId,
        generation_type: 'before_after_visualization',
        source_media_id: beforeMediaId,
        job_id: jobId,
        input_params: {
          prompt: prompt,
          style: style,
          numberOfVariations: numberOfVariations
        },
        output_data: {
          variations: generatedVariations
        },
        confidence: 'high',
        metadata: {
          model: 'google/gemini-3-pro-image-preview',
          latencyMs: 0 // Could track actual latency
        }
      });

    if (logError) {
      console.error('[generate-property-visualization] Failed to log generation:', logError);
      // Don't fail the request - logging is non-critical
    }

    console.log('[generate-property-visualization] Successfully generated', numberOfVariations, 'variation(s)');

    return json({
      success: true,
      generationId: beforeMediaId, // Use beforeMediaId as generation identifier
      variations: generatedVariations,
      beforeMediaId: beforeMediaId,
      jobId: jobId
    });

  } catch (error) {
    console.error('[generate-property-visualization] Unexpected error:', error);
    return json({ 
      error: error instanceof Error ? error.message : "Visualization generation failed" 
    }, { status: 500 });
  }
});

function constructSystemPrompt(style: string): string {
  const basePrompt = `You are an expert property visualization AI specialized in creating realistic before/after transformations for contractor work. 

Your task is to take a "before" photo and generate a professional "after" visualization showing the completed work.

Key guidelines:
- Maintain the exact same camera angle, perspective, and lighting conditions
- Preserve the architectural structure and surrounding elements
- Only modify the specific work areas described in the user's prompt
- Keep the transformation realistic and achievable
- Match the existing photo quality and style`;

  const styleModifiers = {
    realistic: "Create a photo-realistic result that looks like an actual photograph taken after completion. Use natural lighting, realistic materials, and subtle weathering.",
    architectural: "Create a clean, architectural visualization with enhanced clarity and professional presentation. Emphasize clean lines and professional finish.",
    'photo-realistic': "Generate an extremely realistic photograph-quality image. Every detail should look authentic, from material textures to shadows and reflections."
  };

  return `${basePrompt}\n\nStyle: ${styleModifiers[style as keyof typeof styleModifiers] || styleModifiers.realistic}`;
}

function constructUserPrompt(job: any, userPrompt: string, style: string): string {
  const jobContext = job.job_type 
    ? `Job Type: ${job.job_type}\n` 
    : '';
  
  const jobNotes = job.notes 
    ? `Additional Context: ${job.notes}\n` 
    : '';

  return `${jobContext}${jobNotes}
Work Description: ${userPrompt}

Generate a professional "after" visualization showing this work completed. Maintain the exact perspective, lighting, and surrounding elements from the original photo. Only transform the specific areas described in the work description.`;
}
