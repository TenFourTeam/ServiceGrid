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
    const { jobId, proposedStartTime, proposedEndTime, conflicts } = await req.json();

    if (!jobId || !proposedStartTime || !proposedEndTime) {
      return json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Fetch the job being moved
    const { data: job } = await supabase
      .from("jobs")
      .select("*, customers(name, address)")
      .eq("id", jobId)
      .single();

    if (!job) {
      return json({ error: "Job not found" }, { status: 404 });
    }

    // Fetch all jobs for the day to analyze route impact
    const proposedDate = new Date(proposedStartTime);
    const dayStart = new Date(proposedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(proposedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const { data: dayJobs } = await supabase
      .from("jobs")
      .select("*, customers(address)")
      .eq("business_id", businessId)
      .gte("starts_at", dayStart.toISOString())
      .lte("starts_at", dayEnd.toISOString())
      .order("starts_at", { ascending: true });

    // Get Lovable AI API key
    const aiApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!aiApiKey) {
      return json({ error: "AI service not configured" }, { status: 500 });
    }

    // Use Lovable AI to suggest better alternatives
    const systemPrompt = `You are a scheduling assistant helping resolve job conflicts.
A job is being moved to a new time slot that creates conflicts or impacts route efficiency.
Analyze the situation and suggest 2-3 better alternative time slots.

Consider:
- Avoiding conflicts with existing jobs
- Minimizing travel time between jobs
- Keeping jobs in logical geographic order
- Respecting working hours (8 AM - 6 PM by default)

Return suggestions in JSON format.`;

    const userPrompt = `Job being moved:
- Title: ${job.title}
- Customer: ${job.customers?.name}
- Address: ${job.customers?.address || job.address || "Unknown"}
- Original time: ${new Date(job.starts_at).toLocaleString()}
- Proposed new time: ${new Date(proposedStartTime).toLocaleString()} to ${new Date(proposedEndTime).toLocaleString()}
- Duration: ${Math.round((new Date(job.ends_at).getTime() - new Date(job.starts_at).getTime()) / 60000)} minutes

${conflicts && conflicts.length > 0 ? `Conflicts with:
${conflicts.map((c: any) => `- ${c.title} (${new Date(c.start_time).toLocaleString()} to ${new Date(c.end_time).toLocaleString()})`).join('\n')}` : ''}

Other jobs on this day:
${dayJobs?.map(j => `- ${j.title} at ${new Date(j.starts_at).toLocaleTimeString()} (${j.customers?.address || "No address"})`).join('\n') || 'No other jobs'}

Suggest 2-3 better time slots for this job.`;

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
            name: "suggest_alternative_slots",
            description: "Suggest better time slots for the job",
            parameters: {
              type: "object",
              properties: {
                alternatives: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      startTime: { type: "string", description: "ISO datetime string" },
                      endTime: { type: "string", description: "ISO datetime string" },
                      reasoning: { type: "string" },
                      routeImpact: { type: "string", description: "Description of route impact" },
                      recommended: { type: "boolean" }
                    },
                    required: ["startTime", "endTime", "reasoning"]
                  }
                },
                conflictImpact: { type: "string", description: "Overall impact description" }
              },
              required: ["alternatives"]
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "suggest_alternative_slots" } }
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("AI service request failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      return json({ error: "AI failed to generate suggestions" }, { status: 500 });
    }

    const suggestions = JSON.parse(toolCall.function.arguments);

    return json({
      success: true,
      alternatives: suggestions.alternatives || [],
      conflictImpact: suggestions.conflictImpact || "Moving this job would create conflicts",
      originalTime: {
        start: job.starts_at,
        end: job.ends_at
      }
    });

  } catch (error: any) {
    console.error("[suggest-reschedule] Error:", error);
    return json(
      { error: error.message || "Failed to generate reschedule suggestions" },
      { status: 500 }
    );
  }
});
