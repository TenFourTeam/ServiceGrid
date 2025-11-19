import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { requireCtx } from '../_lib/auth.ts';

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

    // Call Lovable AI with vision
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant that analyzes photos of completed work and generates invoice estimates.

Available Services:
${catalogText}

${jobContext ? `\n${jobContext}` : ''}

Analyze the photo and estimate which services were performed based on visible work. Match services to the catalog and provide quantities. Be conservative in estimates - only include services you can clearly see evidence of in the photo.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this photo of completed work and estimate the services performed.'
              },
              {
                type: 'image_url',
                image_url: { url: media.public_url }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'estimate_job_invoice',
              description: 'Generate invoice line items based on photo analysis',
              parameters: {
                type: 'object',
                properties: {
                  workDescription: {
                    type: 'string',
                    description: 'Summary of what work was completed based on the photo'
                  },
                  estimatedServices: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        catalogServiceId: { type: 'string', description: 'ID from service catalog' },
                        serviceName: { type: 'string' },
                        quantity: { type: 'number' },
                        unitPrice: { type: 'number', description: 'Price in cents' },
                        reasoning: { type: 'string', description: 'Why this service was selected' }
                      },
                      required: ['catalogServiceId', 'serviceName', 'quantity', 'unitPrice', 'reasoning']
                    }
                  },
                  additionalNotes: {
                    type: 'string',
                    description: 'Observations about quality, scope, or any issues'
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'How confident are you in this estimate'
                  }
                },
                required: ['workDescription', 'estimatedServices', 'confidence']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'estimate_job_invoice' } }
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded',
            errorType: 'RATE_LIMIT',
            message: 'AI is experiencing high demand. Please try again in a moment.'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Payment required',
            errorType: 'PAYMENT_REQUIRED',
            message: 'AI credits exhausted. Please add credits to continue.'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const estimate = JSON.parse(toolCall.function.arguments);

    // Convert to line items format
    const lineItems = estimate.estimatedServices.map((svc: any, idx: number) => ({
      id: `est-${idx}`,
      name: svc.serviceName,
      quantity: svc.quantity,
      unit_price: svc.unitPrice,
      unit: services.find(s => s.id === svc.catalogServiceId)?.unit_type || 'job',
      notes: svc.reasoning
    }));

    return new Response(
      JSON.stringify({
        estimate: {
          lineItems,
          workDescription: estimate.workDescription,
          additionalNotes: estimate.additionalNotes,
          confidence: estimate.confidence,
          sourceMediaId: mediaId
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Job estimation error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
