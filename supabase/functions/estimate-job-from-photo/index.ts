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

    // Check AI access before processing
    const { requireAIAccess, incrementAICredits } = await import('../_lib/auth.ts');
    await requireAIAccess(ctx, supabase);

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

    console.log('[estimate-job-from-photo] Calling AI service');
    const aiResult = await callAIWithVision(
      {
      systemPrompt: `You are an AI assistant that analyzes photos of completed work and generates detailed estimates with materials, labor, and equipment breakdown.

Available Services Catalog:
${catalogText}

${pricingContext}

${jobContext ? `\n${jobContext}` : ''}

**ANALYSIS GUIDELINES:**

1. **Materials**: Identify physical materials visible or implied in the photo
   - Examples: Paint (gallons), lumber (board feet), fertilizer (bags), mulch (cubic yards)
   - Estimate quantities conservatively based on visible area/work
   - Use market-standard pricing if not in catalog

2. **Labor**: Calculate labor requirements based on visible work scope
   - Estimate total hours required for the visible work
   - Recommend crew size (1-5 workers typically)
   - Consider complexity, safety requirements, skill level needed
   - Standard labor rate: Use catalog rates or estimate $45-85/hour based on skill

3. **Equipment**: Identify specialized equipment or tools required
   - Examples: Equipment rental (days), disposal fees (loads), permits
   - Only include if clearly necessary for the work shown

4. **Services**: General services from catalog that don't fit above categories
   - Examples: "Lawn Mowing Service", "General Maintenance"

**IMPORTANT**: 
- Be conservative in estimates - only include what you can clearly see evidence of
- Separate line items by type (don't combine materials + labor into one line)
- For labor, ALWAYS provide labor_hours and crew_size estimates
- Match to catalog prices when possible, otherwise estimate market rates`,
        userPrompt: 'Analyze this photo of completed work and estimate the materials, labor, equipment, and services required.',
        imageUrl: media.public_url,
        enableCache: true, // Enable 24-hour caching
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_estimate',
              description: 'Generate a structured estimate with materials, labor, and equipment breakdown',
              parameters: {
                type: 'object',
                properties: {
                  line_items: {
                    type: 'array',
                    description: 'Detailed breakdown of materials, labor, equipment, and services',
                    items: {
                      type: 'object',
                      properties: {
                        item_name: { type: 'string', description: 'Name of item/service' },
                        item_type: { 
                          type: 'string', 
                          enum: ['material', 'labor', 'equipment', 'service'],
                          description: 'Type classification'
                        },
                        quantity: { type: 'number', description: 'Quantity needed' },
                        unit_price_cents: { type: 'integer', description: 'Price per unit in cents' },
                        unit_type: { type: 'string', description: 'Unit of measurement' },
                        notes: { type: 'string', description: 'Specific notes' },
                        labor_hours: { 
                          type: 'number', 
                          description: 'For labor items: estimated hours to complete' 
                        },
                        crew_size: { 
                          type: 'number', 
                          description: 'For labor items: recommended number of workers' 
                        },
                        material_category: { 
                          type: 'string', 
                          description: 'For materials: category like Paint, Lumber, etc.' 
                        }
                      },
                      required: ['item_name', 'item_type', 'quantity', 'unit_price_cents', 'unit_type']
                    }
                  },
                  workDescription: {
                    type: 'string',
                    description: 'Brief description of visible work completed'
                  },
                  additionalNotes: {
                    type: 'string',
                    description: 'Observations or recommendations'
                  }
                },
                required: ['line_items', 'workDescription']
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

    // Transform line items with new fields
    const lineItems = estimate.line_items.map((item: any, index: number) => ({
      id: `est-${Date.now()}-${index}`,
      name: item.item_name,
      quantity: item.quantity,
      unit_price: item.unit_price_cents,
      unit: item.unit_type,
      notes: item.notes,
      item_type: item.item_type,
      labor_hours: item.labor_hours,
      crew_size: item.crew_size,
      material_category: item.material_category
    }));

    // Calculate breakdown totals
    const breakdown = lineItems.reduce((acc: any, item: any) => {
      const itemTotal = item.quantity * item.unit_price;
      
      switch (item.item_type) {
        case 'material':
          acc.materials_total += itemTotal;
          break;
        case 'labor':
          acc.labor_total += itemTotal;
          acc.total_labor_hours = (acc.total_labor_hours || 0) + (item.labor_hours || 0);
          acc.total_crew_size = Math.max(acc.total_crew_size || 0, item.crew_size || 0);
          break;
        case 'equipment':
          acc.equipment_total += itemTotal;
          break;
        case 'service':
          acc.services_total += itemTotal;
          break;
      }
      
      return acc;
    }, {
      materials_total: 0,
      labor_total: 0,
      equipment_total: 0,
      services_total: 0,
      total_labor_hours: 0,
      total_crew_size: 0
    });

    console.log('[estimate-job-from-photo] Successfully created generation record');

    // Increment AI credits after successful generation
    const { incrementAICredits } = await import('../_lib/auth.ts');
    await incrementAICredits(ctx, supabase, 1);

    // Return the generation record with the estimate
    const response = {
      id: aiResult.generationId,
      estimate: {
        lineItems,
        workDescription: estimate.workDescription,
        additionalNotes: estimate.additionalNotes,
        confidence,
        sourceMediaId: mediaId,
        breakdown,
        metadata: aiResult.metadata
      }
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error: any) {
    // Handle AI access errors with specific messages
    if (error.message === 'AI_DISABLED') {
      return new Response(
        JSON.stringify({ 
          error: 'AI features are disabled',
          message: 'Contact your administrator to enable AI features.',
          errorType: 'AI_DISABLED'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (error.message === 'CREDIT_LIMIT_EXCEEDED') {
      return new Response(
        JSON.stringify({ 
          error: 'Monthly credit limit reached',
          message: 'Your monthly AI credit limit has been reached. Please increase your limit in Settings.',
          errorType: 'CREDIT_LIMIT_EXCEEDED'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.error('[estimate-job-from-photo] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
