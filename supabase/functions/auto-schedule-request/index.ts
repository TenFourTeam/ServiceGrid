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
    const { requestId } = await req.json();

    if (!requestId) {
      return json({ error: "Request ID is required" }, { status: 400 });
    }

    // Fetch request details
    const { data: request, error: requestError } = await supabase
      .from("requests")
      .select("*, customers(*)")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return json({ error: "Request not found" }, { status: 404 });
    }

    // Fetch existing jobs for next 2 weeks for context
    const now = new Date();
    const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const { data: existingJobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("business_id", businessId)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", twoWeeksLater.toISOString())
      .order("starts_at", { ascending: true });

    // Fetch team members
    const { data: teamMembers } = await supabase
      .from("business_permissions")
      .select("user_id, profiles(full_name, email)")
      .eq("business_id", businessId);

    // Transform request to job format for AI scheduler
    const unscheduledJob = {
      customerId: request.customer_id,
      customerName: request.customers?.name,
      address: request.property_address || request.customers?.address,
      title: request.title,
      notes: request.service_details,
      preferredDate: request.preferred_assessment_date,
      preferredTimes: request.preferred_times,
      estimatedDurationMinutes: 60, // Default 1 hour for assessments
      priority: 2, // Default to high priority for new requests
    };

    // Call AI schedule optimizer
    const aiUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-schedule-optimizer`;
    const aiResponse = await fetch(aiUrl, {
      method: "POST",
      headers: {
        "Authorization": req.headers.get("Authorization") || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        businessId,
        unscheduledJobs: [unscheduledJob],
        existingJobs: existingJobs || [],
        teamMembers: teamMembers || [],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error("AI scheduler failed");
    }

    const { suggestions } = await aiResponse.json();

    if (!suggestions || suggestions.length === 0) {
      return json({ error: "No available time slots found" }, { status: 400 });
    }

    const suggestion = suggestions[0];

    // Create the job
    const { data: newJob, error: createError } = await supabase
      .from("jobs")
      .insert({
        business_id: businessId,
        customer_id: request.customer_id,
        title: `${request.title} - Assessment`,
        address: request.property_address || request.customers?.address,
        notes: `Assessment for request: ${request.title}\n\nService Details: ${request.service_details}${request.notes ? `\n\nNotes: ${request.notes}` : ''}`,
        status: "Scheduled",
        starts_at: suggestion.recommendedStartTime,
        ends_at: suggestion.recommendedEndTime,
        is_assessment: true,
        request_id: requestId,
        ai_suggested: true,
        scheduling_score: suggestion.priorityScore,
        priority: 2,
        estimated_duration_minutes: 60,
      })
      .select()
      .single();

    if (createError || !newJob) {
      throw new Error(createError?.message || "Failed to create job");
    }

    // Assign team member if suggested
    if (suggestion.assignedMemberId) {
      await supabase.from("job_assignments").insert({
        job_id: newJob.id,
        user_id: suggestion.assignedMemberId,
        assigned_by: businessId,
      });
    }

    // Update request status to Scheduled
    await supabase
      .from("requests")
      .update({ status: "Scheduled" })
      .eq("id", requestId);

    return json({
      success: true,
      job: newJob,
      reasoning: suggestion.reasoning,
      schedulingScore: suggestion.priorityScore,
    });

  } catch (error: any) {
    console.error("[auto-schedule-request] Error:", error);
    return json(
      { error: error.message || "Failed to auto-schedule request" },
      { status: 500 }
    );
  }
});
