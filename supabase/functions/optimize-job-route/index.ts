import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Job {
  id: string;
  title?: string;
  address?: string;
  estimatedDurationMinutes?: number;
  startsAt?: string;
  endsAt?: string;
  priority?: number;
  customer?: {
    name: string;
  };
}

interface OptimizationRequest {
  businessId: string;
  jobs: Job[];
  startLocation?: {
    address: string;
    lat?: number;
    lng?: number;
  };
  constraints?: {
    startTime?: string;
    endTime?: string;
    maxTravelTime?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobs, startLocation, constraints }: OptimizationRequest = await req.json();

    console.log('[optimize-job-route] Optimizing route for', jobs.length, 'jobs');

    if (!jobs || jobs.length < 2) {
      return new Response(
        JSON.stringify({ error: 'At least 2 jobs required for route optimization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[optimize-job-route] LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare context for AI
    const jobSummary = jobs.map((job, idx) => ({
      index: idx,
      id: job.id,
      title: job.title || 'Untitled Job',
      address: job.address || 'No address',
      duration: job.estimatedDurationMinutes || 60,
      customer: job.customer?.name || 'Unknown',
      priority: job.priority || 3,
      timeWindow: job.startsAt && job.endsAt 
        ? `${job.startsAt} - ${job.endsAt}`
        : 'Flexible'
    }));

    const systemPrompt = `You are a route optimization expert for service businesses.
Your goal is to reorder jobs to create the most efficient route that minimizes travel time.

Consider:
1. Geographic clustering - group nearby locations together
2. Travel time minimization - create logical route flow (avoid backtracking)
3. Priority jobs - higher priority jobs should be scheduled earlier when possible
4. Time windows - respect any scheduled time windows
5. Duration balance - distribute longer jobs throughout the route

${startLocation ? `Start location: ${startLocation.address}` : 'No specific start location'}

Constraints:
${constraints?.startTime && constraints?.endTime ? `- Work hours: ${constraints.startTime} - ${constraints.endTime}` : '- Standard work hours'}
${constraints?.maxTravelTime ? `- Max travel time between jobs: ${constraints.maxTravelTime} minutes` : '- No travel time limit'}

IMPORTANT: 
- Consider actual geographic routing, not just straight-line distance
- Jobs with existing time windows must maintain their relative order
- High priority jobs (priority 1-2) should be scheduled earlier in the day`;

    const userPrompt = `Optimize this route by reordering the jobs for maximum efficiency:

${JSON.stringify(jobSummary, null, 2)}

Return the optimized order and explain your routing decisions.`;

    console.log('[optimize-job-route] Calling Lovable AI for optimization');

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
                  description: 'Array of job indices in optimized order'
                },
                reasoning: {
                  type: 'string',
                  description: 'Explanation of routing decisions'
                },
                estimatedTimeSaved: {
                  type: 'number',
                  description: 'Estimated time saved in minutes compared to original order'
                },
                estimatedTravelTime: {
                  type: 'number',
                  description: 'Estimated total travel time in minutes'
                },
                suggestions: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Route optimization tips and suggestions'
                }
              },
              required: ['optimizedOrder', 'reasoning', 'estimatedTimeSaved', 'estimatedTravelTime', 'suggestions'],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: 'function', function: { name: 'optimize_route' } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[optimize-job-route] AI API error:', aiResponse.status, errorText);
      
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
    console.log('[optimize-job-route] AI response received');

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error('[optimize-job-route] No tool call in AI response');
      return new Response(
        JSON.stringify({ error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const optimizationResult = JSON.parse(toolCall.function.arguments);
    const { optimizedOrder, reasoning, estimatedTimeSaved, estimatedTravelTime, suggestions } = optimizationResult;

    // Reorder jobs based on AI suggestion
    const optimizedJobs = optimizedOrder.map((idx: number) => jobs[idx]);

    console.log('[optimize-job-route] Optimization complete. Time saved:', estimatedTimeSaved, 'minutes');

    return new Response(
      JSON.stringify({
        optimizedJobs,
        reasoning,
        estimatedTimeSaved,
        estimatedTravelTime,
        suggestions,
        originalOrder: jobs.map((j, i) => i)
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('[optimize-job-route] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
