// Supabase Edge Function: jobs-status-batch
// - POST: update multiple job statuses at once with atomic operations

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders, json } from "../_lib/auth.ts";

interface JobStatusUpdate {
  id: string;
  status: 'Scheduled' | 'In Progress' | 'Completed';
  startsAt?: string;
  endsAt?: string;
}

function badRequest(message: string, status = 400) {
  return json({ error: message }, { status });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return badRequest("Method not allowed", 405);
  }

  try {
    const ctx = await requireCtx(req);

    const body = (await req.json().catch(() => ({}))) as {
      updates: JobStatusUpdate[];
    };

    if (!body.updates || !Array.isArray(body.updates) || body.updates.length === 0) {
      return badRequest("updates array is required and must not be empty");
    }

    console.log(`[jobs-status-batch] Processing ${body.updates.length} status updates for business ${ctx.businessId}`);

    const results = [];
    const errors = [];

    // Process each update individually but in a transaction-like manner
    for (const update of body.updates) {
      try {
        // Validate the job exists and belongs to the business
        const { data: existingJob, error: fetchError } = await ctx.supaAdmin
          .from("jobs")
          .select("id, status, business_id")
          .eq("id", update.id)
          .eq("business_id", ctx.businessId)
          .single();

        if (fetchError || !existingJob) {
          console.warn(`[jobs-status-batch] Job ${update.id} not found or doesn't belong to business`);
          errors.push({ id: update.id, error: "Job not found or access denied" });
          continue;
        }

        // Prepare the update payload
        const updatePayload: any = {
          status: update.status,
        };

        if (update.startsAt !== undefined) {
          updatePayload.starts_at = update.startsAt;
        }

        if (update.endsAt !== undefined) {
          updatePayload.ends_at = update.endsAt;
        }

        // Auto-set end time for completed jobs if not provided
        if (update.status === 'Completed' && !update.endsAt) {
          updatePayload.ends_at = new Date().toISOString();
        }

        // Execute the update
        const { error: updateError } = await ctx.supaAdmin
          .from("jobs")
          .update(updatePayload)
          .eq("id", update.id)
          .eq("business_id", ctx.businessId);

        if (updateError) {
          console.error(`[jobs-status-batch] Failed to update job ${update.id}:`, updateError);
          errors.push({ id: update.id, error: updateError.message });
        } else {
          console.log(`[jobs-status-batch] Successfully updated job ${update.id} to status: ${update.status}`);
          results.push({ 
            id: update.id, 
            status: update.status,
            success: true 
          });
        }

      } catch (error) {
        console.error(`[jobs-status-batch] Error processing job ${update.id}:`, error);
        errors.push({ 
          id: update.id, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    const response = {
      success: errors.length === 0,
      updated: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    };

    console.log(`[jobs-status-batch] Batch update completed: ${results.length} successful, ${errors.length} failed`);

    return json(response, { 
      status: errors.length === 0 ? 200 : 207 // 207 Multi-Status for partial success
    });

  } catch (error) {
    console.error("[jobs-status-batch] Unexpected error:", error);
    return json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
});