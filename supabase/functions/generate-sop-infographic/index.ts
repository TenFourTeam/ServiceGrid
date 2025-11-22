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
      serviceId, 
      serviceName, 
      description 
    } = await req.json();

    // Validate inputs
    if (!serviceId) {
      return json({ error: "serviceId is required" }, { status: 400 });
    }
    if (!serviceName) {
      return json({ error: "serviceName is required" }, { status: 400 });
    }

    // Verify the service exists and belongs to this business
    const { data: service, error: serviceError } = await admin
      .from('service_catalog')
      .select('*')
      .eq('id', serviceId)
      .eq('business_id', businessId)
      .single();

    if (serviceError || !service) {
      console.error('[generate-sop-infographic] Service not found:', serviceError);
      return json({ error: "Service not found" }, { status: 404 });
    }

    // Construct AI prompt for infographic generation
    const systemPrompt = constructSystemPrompt();
    const userPrompt = constructUserPrompt(serviceName, description || service.description);

    console.log('[generate-sop-infographic] System prompt:', systemPrompt);
    console.log('[generate-sop-infographic] User prompt:', userPrompt);

    // Call Lovable AI with google/gemini-3-pro-image-preview model
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error('[generate-sop-infographic] LOVABLE_API_KEY not configured');
      return json({ error: "AI service not configured" }, { status: 500 });
    }

    console.log('[generate-sop-infographic] Generating infographic...');

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
            content: userPrompt
          }
        ],
        modalities: ["image", "text"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-sop-infographic] AI API error:', response.status, errorText);
      
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
    console.log('[generate-sop-infographic] AI response:', JSON.stringify(aiData).substring(0, 200));

    // Extract base64 image from response
    const generatedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImageUrl) {
      console.error('[generate-sop-infographic] No image in AI response');
      return json({ error: "AI did not generate an image" }, { status: 500 });
    }

    // Parse base64 data
    const base64Data = generatedImageUrl.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

    // Generate storage path
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).slice(2, 8);
    const storagePath = `${businessId}/sop-infographics/${serviceId}_${timestamp}_${randomId}.png`;

    // Upload to Supabase Storage
    const { error: uploadError } = await admin.storage
      .from('sop-infographics')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[generate-sop-infographic] Storage upload error:', uploadError);
      return json({ error: "Failed to store generated image", details: uploadError.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = admin.storage.from('sop-infographics').getPublicUrl(storagePath);
    const publicUrl = urlData.publicUrl;

    // Update service_catalog with infographic_url
    const { error: updateError } = await admin
      .from('service_catalog')
      .update({ infographic_url: publicUrl })
      .eq('id', serviceId)
      .eq('business_id', businessId);

    if (updateError) {
      console.error('[generate-sop-infographic] Failed to update service:', updateError);
      // Don't fail the request - infographic was generated successfully
    }

    console.log('[generate-sop-infographic] Successfully generated infographic');

    return json({
      success: true,
      infographicUrl: publicUrl,
      serviceId: serviceId
    });

  } catch (error) {
    console.error('[generate-sop-infographic] Unexpected error:', error);
    return json({ 
      error: error instanceof Error ? error.message : "Infographic generation failed" 
    }, { status: 500 });
  }
});

function constructSystemPrompt(): string {
  return `You are an expert at creating clear, professional process infographics for Standard Operating Procedures (SOPs).

Your task is to generate a visually appealing infographic that breaks down the SOP process into clear, sequential steps.

Style Guidelines:
- Use a clean, modern design with clear visual hierarchy
- Include numbered steps or flowchart elements
- Use icons, arrows, and visual separators
- Employ a professional color scheme (blues, greens, or complementary brand colors)
- Make it suitable for printing or digital display
- Emphasize clarity and readability over complexity
- Use bold, easy-to-read fonts for step titles
- Include brief, actionable text descriptions under each step

Layout: Vertical or horizontal flow, depending on number of steps (3-8 steps ideal). Use visual elements like:
- Numbered circles or badges for steps
- Arrows showing progression
- Icons representing each step action
- Brief text descriptions (5-10 words per step)
- Clear start and end indicators

The infographic should be professional enough for client presentations yet practical enough for field workers to reference on mobile devices or printed materials.`;
}

function constructUserPrompt(serviceName: string, description?: string): string {
  const descriptionText = description 
    ? `\n\n**Process Description:**\n${description}`
    : '';

  return `Create a professional process infographic for this Standard Operating Procedure:

**SOP Title:** ${serviceName}${descriptionText}

Break down the process into clear, actionable steps (typically 4-6 steps). 

Generate an infographic that:
1. Shows the workflow from start to finish
2. Uses visual icons and numbered steps
3. Includes brief action-oriented descriptions
4. Has a clean, modern aesthetic
5. Is legible on both mobile devices and printed materials

Focus on clarity and practicality. This will be used by field workers to ensure consistent service delivery.`;
}
