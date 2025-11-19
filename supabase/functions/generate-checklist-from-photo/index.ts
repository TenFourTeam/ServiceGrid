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

    console.log('[generate-checklist-from-photo] Processing request', { mediaId, jobId, userId: ctx.userId });

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

    console.log('[generate-checklist-from-photo] Calling AI service');
    const aiResult = await callAIWithVision(
      {
        systemPrompt: `You are an AI assistant that analyzes photos of work sites and generates detailed task checklists (SOPs).

${jobContext ? `\n${jobContext}` : ''}

Analyze the photo and identify all tasks that need to be completed based on the visible work required. Create a comprehensive checklist with clear, actionable tasks. For each task:
- Provide a clear, concise title
- Add detailed description if needed
- Estimate time in minutes
- Determine if photo verification is needed
- Specify how many photos are required (0-5)
- Order tasks logically

Be thorough but realistic. Only include tasks you can clearly identify from the photo.`,
        userPrompt: 'Analyze this photo and generate a detailed task checklist for completing the work.',
        imageUrl: media.public_url,
        enableCache: true, // Enable 24-hour caching
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_checklist',
              description: 'Generate a structured task checklist from a job site photo',
              parameters: {
                type: 'object',
                properties: {
                  checklist_title: {
                    type: 'string',
                    description: 'A clear title for this checklist based on the work visible'
                  },
                  tasks: {
                    type: 'array',
                    description: 'Ordered list of tasks to complete',
                    items: {
                      type: 'object',
                      properties: {
                        title: {
                          type: 'string',
                          description: 'Clear, actionable task title'
                        },
                        description: {
                          type: 'string',
                          description: 'Detailed instructions or context'
                        },
                        position: {
                          type: 'integer',
                          description: 'Order position (0-based)'
                        },
                        category: {
                          type: 'string',
                          description: 'Task category (e.g., "Preparation", "Main Work", "Cleanup")'
                        },
                        estimated_duration_minutes: {
                          type: 'integer',
                          description: 'Estimated time to complete in minutes'
                        },
                        required_photo_count: {
                          type: 'integer',
                          description: 'Number of photos required (0-5)',
                          minimum: 0,
                          maximum: 5
                        }
                      },
                      required: ['title', 'position', 'required_photo_count']
                    }
                  },
                  notes: {
                    type: 'string',
                    description: 'Additional notes or safety considerations'
                  }
                },
                required: ['checklist_title', 'tasks']
              }
            }
          }
        ]
      },
      supabase,
      {
        businessId: ctx.businessId,
        userId: ctx.userId,
        generationType: 'checklist_generation',
        sourceMediaId: mediaId,
        jobId: jobId || undefined,
        inputParams: { mediaId, jobId },
        outputData: {}, // Will be filled by callAIWithVision
        confidence: 'medium', // Will be calculated
        metadata: { hasJobContext: !!jobContext }
      }
    );

    if (!aiResult.success) {
      console.error('[generate-checklist-from-photo] AI error:', aiResult.error);
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

    const checklist = aiResult.data;
    const confidence = calculateConfidence(checklist, 'checklist_generation');

    console.log('[generate-checklist-from-photo] Generated checklist with', checklist.tasks.length, 'tasks');

    // Increment AI credits after successful generation
    const { incrementAICredits } = await import('../_lib/auth.ts');
    await incrementAICredits(ctx, supabase, 1);

    // Return the generation record with the checklist
    const response = {
      id: aiResult.generationId,
      checklist: {
        checklist_title: checklist.checklist_title,
        tasks: checklist.tasks,
        confidence,
        notes: checklist.notes,
        sourceMediaId: mediaId,
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
    console.error('[generate-checklist-from-photo] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
