import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const { supaAdmin: supabase, businessId } = await requireCtx(req);
    const { urgentJobData, conflictingJobIds } = await req.json();

    if (!urgentJobData || !conflictingJobIds || conflictingJobIds.length === 0) {
      return json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Fetch conflicting lower-priority jobs
    const { data: conflictingJobs } = await supabase
      .from("jobs")
      .select("*, customers(name, address)")
      .in("id", conflictingJobIds)
      .order("starts_at", { ascending: true });

    if (!conflictingJobs || conflictingJobs.length === 0) {
      return json({ error: "Conflicting jobs not found" }, { status: 404 });
    }

    // Fetch schedule context (jobs for next 2 weeks)
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const { data: allJobs } = await supabase
      .from("jobs")
      .select("*, customers(address)")
      .eq("business_id", businessId)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", twoWeeksLater.toISOString())
      .order("starts_at", { ascending: true });

    // Get Lovable AI API key
    const aiApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!aiApiKey) {
      return json({ error: "AI service not configured" }, { status: 500 });
    }

    // Use Lovable AI to generate rescue plan
    const systemPrompt = `You are a scheduling assistant handling urgent job conflicts.
An urgent job needs to be scheduled, but conflicts with lower-priority jobs.
Generate a rescue plan that:
1. Schedules the urgent job at the requested time
2. Finds new slots for lower-priority jobs with minimal disruption
3. Keeps jobs on the same day if possible
4. Minimizes travel time increases
5. Ensures no new conflicts are created

Return a structured rescue plan with clear reasoning.`;

    const userPrompt = `Urgent Job:
- Title: ${urgentJobData.title}
- Time: ${new Date(urgentJobData.startsAt).toLocaleString()} to ${new Date(urgentJobData.endsAt).toLocaleString()}
- Priority: ${urgentJobData.priority} (Urgent)
- Address: ${urgentJobData.address || "Unknown"}

Conflicting Lower-Priority Jobs:
${conflictingJobs.map(j => `- ${j.title} (Priority: ${j.priority || 3})
  Current time: ${new Date(j.starts_at).toLocaleString()} to ${new Date(j.ends_at).toLocaleString()}
  Address: ${j.customers?.address || j.address || "Unknown"}`).join('\n\n')}

Schedule Context (next 2 weeks):
${allJobs?.slice(0, 20).map(j => `- ${j.title} at ${new Date(j.starts_at).toLocaleString()} (Priority: ${j.priority || 3})`).join('\n') || 'No jobs scheduled'}

Generate a rescue plan to accommodate the urgent job.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${aiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.0-flash-exp",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_rescue_plan",
            description: "Generate a plan to reschedule lower-priority jobs",
            parameters: {
              type: "object",
              properties: {
                reschedules: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      jobId: { type: "string" },
                      jobTitle: { type: "string" },
                      originalStart: { type: "string" },
                      originalEnd: { type: "string" },
                      newStart: { type: "string", description: "ISO datetime string" },
                      newEnd: { type: "string", description: "ISO datetime string" },
                      reasoning: { type: "string" }
                    },
                    required: ["jobId", "jobTitle", "newStart", "newEnd", "reasoning"]
                  }
                },
                impactSummary: {
                  type: "object",
                  properties: {
                    travelTimeChange: { type: "string" },
                    overallImpact: { type: "string" },
                    recommendation: { type: "string" }
                  }
                }
              },
              required: ["reschedules", "impactSummary"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "generate_rescue_plan" } }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("AI service request failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return json({ error: "AI failed to generate rescue plan" }, { status: 500 });
    }

    const rescuePlan = JSON.parse(toolCall.function.arguments);

    return json({
      success: true,
      urgentJob: {
        title: urgentJobData.title,
        startsAt: urgentJobData.startsAt,
        endsAt: urgentJobData.endsAt,
        priority: urgentJobData.priority
      },
      reschedules: rescuePlan.reschedules || [],
      impactSummary: rescuePlan.impactSummary || {
        overallImpact: "Minimal disruption",
        recommendation: "Accept this rescue plan"
      }
    });

  } catch (error: any) {
    console.error("[priority-reschedule] Error:", error);
    return json(
      { error: error.message || "Failed to generate priority rescue plan" },
      { status: 500 }
    );
  }
});
