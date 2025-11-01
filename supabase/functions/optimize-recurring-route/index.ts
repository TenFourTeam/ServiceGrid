import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecurringJobTemplate {
  id: string;
  title: string;
  address: string;
  estimated_duration_minutes: number;
  recurrence_pattern: string;
  preferred_time_start?: string;
  preferred_time_end?: string;
  customer?: {
    name: string;
  };
}

interface OptimizationRequest {
  businessId: string;
  templates: RecurringJobTemplate[];
  constraints?: {
    maxDailyHours?: number;
    teamSize?: number;
    startTime?: string;
    endTime?: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { templates, constraints }: OptimizationRequest = await req.json();

    console.log('[optimize-recurring-route] Optimizing route for', templates.length, 'templates');

    if (!templates || templates.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No templates provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[optimize-recurring-route] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare context for AI
    const templateSummary = templates.map((t, idx) => ({
      index: idx,
      id: t.id,
      title: t.title,
      address: t.address,
      duration: t.estimated_duration_minutes,
      customer: t.customer?.name || 'Unknown',
      pattern: t.recurrence_pattern,
      timeWindow: t.preferred_time_start && t.preferred_time_end 
        ? `${t.preferred_time_start} - ${t.preferred_time_end}`
        : 'Flexible'
    }));

    const systemPrompt = `You are a route optimization expert for service businesses. 
Your goal is to reorder recurring job templates to minimize travel time and maximize efficiency.

Consider:
1. Geographic clustering - group nearby locations together
2. Travel time minimization - reduce total route distance
3. Time windows - respect customer preferred time windows
4. Logical flow - create sensible daily routes
5. Work-life balance - efficient routes mean earlier finish times

Constraints:
${constraints?.maxDailyHours ? `- Max daily hours: ${constraints.maxDailyHours}` : '- No time constraints specified'}
${constraints?.teamSize ? `- Team size: ${constraints.teamSize}` : '- Team size not specified'}
${constraints?.startTime && constraints?.endTime ? `- Work hours: ${constraints.startTime} - ${constraints.endTime}` : '- Standard work hours'}

IMPORTANT: When reordering jobs, ensure jobs with specific time windows are grouped logically and don't conflict.`;

    const userPrompt = `Optimize this route by reordering the jobs for maximum efficiency:

${JSON.stringify(templateSummary, null, 2)}

Return the optimized order and explain your reasoning.`;

    console.log('[optimize-recurring-route] Calling Lovable AI for optimization');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'optimize_route',
            description: 'Return the optimized route order with reasoning',
            parameters: {
              type: 'object',
              properties: {
                optimizedOrder: {
                  type: 'array',
                  items: { type: 'number' },
                  description: 'Array of template indices in optimized order'
                },
                reasoning: {
                  type: 'string',
                  description: 'Explanation of optimization decisions'
                },
                estimatedTimeSaved: {
                  type: 'number',
                  description: 'Estimated time saved in minutes'
                },
                suggestions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Additional optimization suggestions'
                }
              },
              required: ['optimizedOrder', 'reasoning', 'estimatedTimeSaved', 'suggestions'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'optimize_route' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[optimize-recurring-route] AI API error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'AI rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    console.log('[optimize-recurring-route] AI response received');

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('[optimize-recurring-route] No tool call in AI response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const optimizationResult = JSON.parse(toolCall.function.arguments);
    const { optimizedOrder, reasoning, estimatedTimeSaved, suggestions } = optimizationResult;

    // Reorder templates based on AI suggestion
    const optimizedTemplates = optimizedOrder.map((idx: number) => templates[idx]);

    console.log('[optimize-recurring-route] Optimization complete. Time saved:', estimatedTimeSaved, 'minutes');

    return new Response(
      JSON.stringify({
        optimizedTemplates,
        reasoning,
        estimatedTimeSaved,
        suggestions
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[optimize-recurring-route] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
