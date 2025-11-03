import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      businessId, 
      unscheduledJobs, 
      existingJobs, 
      teamMembers,
      constraints,
      availability,
      timeOff,
      customerPreferences
    } = await req.json();
    
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

    // Helper functions for formatting context
    const formatTeamAvailability = () => {
      if (!availability || availability.length === 0) return 'No availability data provided';
      
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const byMember = availability.reduce((acc: any, avail: any) => {
        if (!acc[avail.user_id]) acc[avail.user_id] = [];
        acc[avail.user_id].push(avail);
        return acc;
      }, {});

      return Object.entries(byMember).map(([userId, avails]: [string, any]) => {
        const member = teamMembers.find((m: any) => m.user_id === userId);
        const name = member?.profiles?.full_name || 'Unknown';
        const schedule = (avails as any[]).map((a: any) => 
          `${days[a.day_of_week]}: ${a.start_time}-${a.end_time}${!a.is_available ? ' (unavailable)' : ''}`
        ).join(', ');
        return `${name}: ${schedule}`;
      }).join('\n');
    };

    const formatTimeOff = () => {
      if (!timeOff || timeOff.length === 0) return 'No time off scheduled';
      
      return timeOff
        .filter((t: any) => t.status === 'approved')
        .map((t: any) => {
          const member = teamMembers.find((m: any) => m.user_id === t.user_id);
          const name = member?.profiles?.full_name || 'Unknown';
          return `${name}: ${t.start_date} to ${t.end_date}${t.reason ? ` (${t.reason})` : ''}`;
        }).join('\n') || 'No approved time off';
    };

    const formatCustomerPreferences = () => {
      if (!customerPreferences || customerPreferences.length === 0) return 'No customer preferences';
      
      return customerPreferences.map((pref: any) => {
        const job = unscheduledJobs.find((j: any) => j.customer_id === pref.id);
        if (!job) return null;
        
        let prefStr = `Job "${job.title}" (${pref.name}):`;
        if (pref.preferred_days?.length > 0) {
          prefStr += ` Prefers ${pref.preferred_days.join(', ')}`;
        }
        if (pref.avoid_days?.length > 0) {
          prefStr += ` | Avoid ${pref.avoid_days.join(', ')}`;
        }
        if (pref.preferred_time_window) {
          prefStr += ` | Time window: ${pref.preferred_time_window.start}-${pref.preferred_time_window.end}`;
        }
        return prefStr;
      }).filter(Boolean).join('\n') || 'No specific preferences';
    };

    const formatConstraints = () => {
      if (!constraints || constraints.length === 0) {
        return 'Standard business hours: 8 AM - 5 PM\nNo specific constraints';
      }
      
      return constraints.map((c: any) => {
        if (c.constraint_type === 'max_jobs_per_day') {
          return `Max ${c.constraint_value.max_jobs} jobs per day`;
        }
        if (c.constraint_type === 'max_hours_per_day') {
          return `Max ${c.constraint_value.max_hours} hours per day`;
        }
        if (c.constraint_type === 'operating_hours') {
          return `Operating hours: ${c.constraint_value.start_time} - ${c.constraint_value.end_time}`;
        }
        return null;
      }).filter(Boolean).join('\n') || 'No specific constraints';
    };

    // Build enhanced context for AI
    const systemPrompt = `You are an expert scheduling optimizer for service businesses.

OPTIMIZATION GOALS (in priority order):
1. Respect hard constraints (availability, time off, business hours)
2. Schedule urgent jobs first (priority 1-2 = urgent, 3-5 = normal)
3. Minimize total travel time (group jobs by location when possible)
4. Balance workload across team members
5. Honor customer preferred time windows and days
6. Avoid scheduling gaps > 2 hours in daily schedules
7. Keep jobs within business operating hours

BUSINESS CONSTRAINTS:
${formatConstraints()}

TEAM AVAILABILITY (weekly patterns):
${formatTeamAvailability()}

APPROVED TIME OFF:
${formatTimeOff()}

CUSTOMER PREFERENCES:
${formatCustomerPreferences()}

SCHEDULING INTELLIGENCE:
- Always check if team member has approved time off before assigning
- Group jobs by location to minimize driving between appointments
- Consider job estimated duration when calculating end times
- If customer has preferred days/times, prioritize those slots
- Balance workload - don't overload one person while others are idle
- Leave 15-30 minute buffer between jobs for travel/prep
- For urgent jobs (priority 1-2), schedule within next 24-48 hours

Return structured suggestions with clear reasoning for each recommendation.`;

    const userPrompt = `
Current date: ${new Date().toISOString()}

UNSCHEDULED JOBS (need scheduling):
${JSON.stringify(unscheduledJobs.map((j: any) => ({
  id: j.id,
  title: j.title,
  customer: j.customers?.name,
  address: j.customers?.address || j.address,
  priority: j.priority || 3,
  estimated_duration_minutes: j.estimated_duration_minutes || 60,
  notes: j.notes
})), null, 2)}

EXISTING SCHEDULE (already booked):
${JSON.stringify(existingJobs.slice(0, 30).map((j: any) => ({
  title: j.title,
  starts_at: j.starts_at,
  ends_at: j.ends_at,
  address: j.address || j.customers?.address,
  assigned_to: j.job_assignments?.[0]?.user_id
})), null, 2)}

AVAILABLE TEAM MEMBERS:
${JSON.stringify(teamMembers.map((m: any) => ({
  id: m.user_id,
  name: m.profiles?.full_name || m.profiles?.email,
  role: m.role || 'worker'
})), null, 2)}

Analyze all the context above and suggest optimal scheduling for each unscheduled job.

For each job, provide:
- recommendedStartTime: ISO 8601 datetime (e.g., "2024-03-15T09:00:00Z")
- recommendedEndTime: ISO 8601 datetime
- assignedMemberId: Team member ID (must be from available members list)
- priorityScore: Confidence score 0.0-1.0 (how optimal is this suggestion)
- reasoning: Clear explanation of WHY this time/person/date is optimal
- alternatives: Brief mention of 1-2 backup options if this doesn't work

IMPORTANT: 
- Check availability before assigning
- Respect time off requests
- Honor customer preferences when possible
- Explain your reasoning clearly
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
                    assignedMemberId: { type: "string", description: "Team member ID to assign" },
                    priorityScore: { type: "number", description: "Confidence score 0.0-1.0" },
                    reasoning: { type: "string", description: "Why this time slot is optimal" },
                    alternatives: { type: "string", description: "Brief mention of backup options" },
                    travelTimeMinutes: { type: "number", description: "Estimated travel time from previous job" }
                  },
                  required: ["jobId", "recommendedStartTime", "recommendedEndTime", "assignedMemberId", "priorityScore", "reasoning"]
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
