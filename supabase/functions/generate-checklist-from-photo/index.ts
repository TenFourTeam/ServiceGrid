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
            content: `You are an AI assistant that analyzes photos of work sites and generates detailed task checklists (SOPs).

${jobContext ? `\n${jobContext}` : ''}

Analyze the photo and identify all tasks that need to be completed based on the visible work required. Create a comprehensive checklist with clear, actionable tasks. For each task:
- Provide a clear, concise title
- Add detailed description if needed
- Estimate time in minutes
- Determine if photo verification is needed
- Specify how many photos are required (0-5)
- Order tasks logically

Be thorough but realistic. Only include tasks you can clearly identify from the photo.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this photo and generate a detailed task checklist for completing the work.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: media.public_url
                }
              }
            ]
          }
        ],
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
                    description: 'Overall title for the checklist based on the work type'
                  },
                  tasks: {
                    type: 'array',
                    description: 'List of tasks in logical order',
                    items: {
                      type: 'object',
                      properties: {
                        title: {
                          type: 'string',
                          description: 'Clear, actionable task title'
                        },
                        description: {
                          type: 'string',
                          description: 'Optional detailed description or notes'
                        },
                        position: {
                          type: 'number',
                          description: 'Order position (starting from 0)'
                        },
                        category: {
                          type: 'string',
                          description: 'Task category (e.g., "Preparation", "Main Work", "Cleanup", "Inspection")'
                        },
                        estimated_duration_minutes: {
                          type: 'number',
                          description: 'Estimated time to complete in minutes'
                        },
                        required_photo_count: {
                          type: 'number',
                          description: 'Number of verification photos required (0-5)',
                          minimum: 0,
                          maximum: 5
                        }
                      },
                      required: ['title', 'position', 'required_photo_count']
                    }
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Confidence level in the generated checklist'
                  },
                  notes: {
                    type: 'string',
                    description: 'Any additional context or warnings'
                  }
                },
                required: ['checklist_title', 'tasks', 'confidence']
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_checklist' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[generate-checklist-from-photo] AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI rate limit', errorType: 'RATE_LIMIT' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required', errorType: 'PAYMENT_REQUIRED' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error('AI request failed');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No checklist generated');
    }

    const checklist = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ 
        checklist: {
          ...checklist,
          sourceMediaId: mediaId
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error: any) {
    console.error('[generate-checklist-from-photo] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
