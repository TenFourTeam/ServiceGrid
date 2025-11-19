import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { requireCtx } from '../_lib/auth.ts';
import { callAIWithVision, calculateConfidence } from '../_lib/ai-service.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ctx = await requireCtx(req);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { mediaId, jobId } = await req.json();

    if (!mediaId) {
      return new Response(
        JSON.stringify({ error: 'mediaId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[estimate-job-from-photo] Processing request', { mediaId, jobId, userId: ctx.userId });

    // Fetch media
    const { data: media, error: mediaError } = await supabase
      .from('sg_media')
      .select('public_url, file_type')
      .eq('id', mediaId)
      .eq('business_id', ctx.businessId)
      .single();

    if (mediaError || !media) {
      return new Response(
        JSON.stringify({ error: 'Media not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch service catalog
    const { data: services, error: servicesError } = await supabase
      .from('service_catalog')
      .select('*')
      .eq('business_id', ctx.businessId)
      .eq('is_active', true);

    if (servicesError) throw servicesError;

    if (!services || services.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'No services in catalog',
          message: 'Please add services to your catalog before using AI estimation'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch job details if provided
    let jobContext = '';
    if (jobId) {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('title, notes, address')
        .eq('id', jobId)
        .eq('business_id', ctx.businessId)
        .single();

      if (!jobError && job) {
        jobContext = `Job Details: ${job.title || 'Untitled'}\nLocation: ${job.address || 'N/A'}\nNotes: ${job.notes || 'None'}`;
      }
    }

    // Prepare service catalog for AI
    const catalogText = services.map(s => 
      `- ${s.service_name} (${s.category || 'General'}): $${(s.unit_price / 100).toFixed(2)} ${s.unit_type}${s.description ? ` - ${s.description}` : ''}`
    ).join('\n');

    // Call AI service
    console.log('[estimate-job-from-photo] Calling AI service');
    const aiResult = await callAIWithVision(
      {
        systemPrompt: `You are an AI assistant that analyzes photos of completed work and generates invoice estimates.

Available Services:
${catalogText}

${jobContext ? `\n${jobContext}` : ''}

Analyze the photo and estimate which services were performed based on visible work. Match services to the catalog and provide quantities. Be conservative in estimates - only include services you can clearly see evidence of in the photo.`,
        userPrompt: 'Analyze this photo of completed work and estimate the services performed.',
        imageUrl: media.public_url,
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_estimate',
              description: 'Generate a structured estimate from a job photo',
              parameters: {
                type: 'object',
                properties: {
                  services: {
                    type: 'array',
                    description: 'List of services matched to the service catalog',
                    items: {
                      type: 'object',
                      properties: {
                        service_name: { type: 'string', description: 'Name from catalog' },
                        quantity: { type: 'number', description: 'Estimated quantity' },
                        unit_price_cents: { type: 'integer', description: 'Price in cents from catalog' },
                        unit_type: { type: 'string', description: 'Unit type from catalog' },
                        notes: { type: 'string', description: 'Optional specific notes about this service' }
                      },
                      required: ['service_name', 'quantity', 'unit_price_cents', 'unit_type']
                    }
                  },
                  workDescription: {
                    type: 'string',
                    description: 'Brief description of visible work completed'
                  },
                  additionalNotes: {
                    type: 'string',
                    description: 'Any additional observations or recommendations'
                  }
                },
                required: ['services', 'workDescription']
              }
            }
          }
        ]
      },
      supabase,
      {
        businessId: ctx.businessId,
        userId: ctx.userId,
        generationType: 'invoice_estimate',
        sourceMediaId: mediaId,
        jobId: jobId || undefined,
        inputParams: { mediaId, jobId, catalogSize: services.length },
        outputData: {}, // Will be filled by callAIWithVision
        confidence: 'medium', // Will be calculated
        metadata: { hasJobContext: !!jobContext }
      }
    );

    if (!aiResult.success) {
      console.error('[estimate-job-from-photo] AI error:', aiResult.error);
      return new Response(
        JSON.stringify({ 
          error: aiResult.error?.message || 'AI processing failed',
          errorType: aiResult.error?.type
        }),
        { 
          status: aiResult.error?.status || 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const estimate = aiResult.data;
    const confidence = calculateConfidence(estimate, 'invoice_estimate');

    // Transform services into line items with IDs
    const lineItems = estimate.services.map((service: any, index: number) => ({
      id: `est-${Date.now()}-${index}`,
      name: service.service_name,
      quantity: service.quantity,
      unit_price: service.unit_price_cents,
      unit: service.unit_type,
      notes: service.notes
    }));

    console.log('[estimate-job-from-photo] Generated estimate with', lineItems.length, 'line items');

    return new Response(
      JSON.stringify({
        estimate: {
          lineItems,
          workDescription: estimate.workDescription,
          additionalNotes: estimate.additionalNotes,
          confidence,
          sourceMediaId: mediaId,
          metadata: aiResult.metadata
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[estimate-job-from-photo] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
