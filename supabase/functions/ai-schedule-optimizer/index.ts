import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessId, unscheduledJobs, existingJobs, teamMembers } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('[ai-schedule-optimizer] Lovable AI not configured');
      throw new Error('Lovable AI not configured');
    }

    console.info('[ai-schedule-optimizer] Processing request', { 
      businessId, 
      unscheduledJobsCount: unscheduledJobs.length,
      existingJobsCount: existingJobs.length,
      teamMembersCount: teamMembers.length
    });

    // Build context for AI
    const systemPrompt = `You are an intelligent scheduling assistant for a service business.
Analyze the provided data and suggest optimal scheduling for unscheduled jobs.

Consider these factors:
1. Job priority (1=urgent, 5=low priority) - urgent jobs should be scheduled ASAP
2. Geographic proximity between jobs (minimize travel time)
3. Team member availability and current workload
4. Customer preferred time windows if provided
5. Estimated job duration

Return structured suggestions with clear reasoning for each recommendation.`;

    const userPrompt = `
Current date: ${new Date().toISOString()}

Unscheduled Jobs (need scheduling):
${JSON.stringify(unscheduledJobs, null, 2)}

Existing Schedule (already scheduled jobs):
${JSON.stringify(existingJobs.slice(0, 20), null, 2)}

Available Team Members:
${JSON.stringify(teamMembers, null, 2)}

Please suggest optimal time slots for each unscheduled job. For each suggestion:
- Consider job priority and urgency
- Group jobs by location to minimize travel
- Balance workload across team members
- Respect preferred time windows
- Account for estimated duration
`;

    console.info('[ai-schedule-optimizer] Calling Lovable AI');
    // Call Lovable AI
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
          type: "function",
          name: "suggest_schedules",
          description: "Return scheduling suggestions for unscheduled jobs",
          parameters: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    jobId: { type: "string", description: "The job ID being scheduled" },
                    recommendedStartTime: { type: "string", description: "ISO 8601 datetime for start" },
                    recommendedEndTime: { type: "string", description: "ISO 8601 datetime for end" },
                    assignedMemberId: { type: "string", description: "Team member ID to assign (optional)" },
                    priorityScore: { type: "number", description: "Confidence score 0.0-1.0" },
                    reasoning: { type: "string", description: "Why this time slot is optimal" }
                  },
                  required: ["jobId", "recommendedStartTime", "recommendedEndTime", "priorityScore", "reasoning"]
                }
              }
            },
            required: ["suggestions"]
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_schedules" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('[ai-schedule-optimizer] Lovable AI error:', aiResponse.status, errorText);
      throw new Error('AI scheduling failed');
    }

    const aiData = await aiResponse.json();
    console.info('[ai-schedule-optimizer] AI response received', { 
      hasChoices: !!aiData.choices?.[0],
      hasToolCalls: !!aiData.choices?.[0]?.message?.tool_calls 
    });

    const toolCall = aiData.choices[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      console.warn('[ai-schedule-optimizer] No suggestions returned from AI');
      throw new Error('No suggestions returned from AI');
    }

    const suggestions = JSON.parse(toolCall.function.arguments);
    console.info('[ai-schedule-optimizer] Generated suggestions', { 
      count: suggestions.suggestions?.length || 0 
    });

    return new Response(
      JSON.stringify({ suggestions: suggestions.suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[ai-schedule-optimizer] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
