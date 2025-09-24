import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { requireCtx, corsHeaders } from "../_lib/auth.ts";

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

interface WorkOrderConfirmationRequest {
  type: 'single' | 'bulk';
  jobId?: string; // For single job confirmation
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate request and get business context
    const { businessId, supaAdmin } = await requireCtx(req);
    const { type, jobId }: Omit<WorkOrderConfirmationRequest, 'businessId'> = await req.json();
    
    console.log('[send-work-order-confirmations] Request:', { type, jobId, businessId });

    let jobsToProcess = [];
    
    if (type === 'single' && jobId) {
      // Get single job - only if not already confirmed
      console.log(`[send-work-order-confirmations] Fetching single job ${jobId} without joins first`);
      
      // First get just the job data
      const { data: job, error: jobError } = await supaAdmin
        .from('jobs')
        .select('*')
        .eq('id', jobId)
        .eq('business_id', businessId)
        .is('confirmation_token', null)
        .single();
      
      if (jobError) {
        console.error(`[send-work-order-confirmations] Error fetching single job:`, jobError);
        throw jobError;
      }
      
      if (job) {
        // Now get customer data separately
        const { data: customer, error: customerError } = await supaAdmin
          .from('customers')
          .select('*')
          .eq('id', job.customer_id)
          .single();
        
        if (customerError) {
          console.error(`[send-work-order-confirmations] Error fetching customer:`, customerError);
          throw customerError;
        }
        
        // Now get business data separately
        const { data: business, error: businessError } = await supaAdmin
          .from('businesses')
          .select('*')
          .eq('id', job.business_id)
          .single();
        
        if (businessError) {
          console.error(`[send-work-order-confirmations] Error fetching business:`, businessError);
          throw businessError;
        }
        
        jobsToProcess = [{
          ...job,
          customers: customer,
          businesses: business
        }];
      }
      
    } else if (type === 'bulk') {
      // Get all scheduled jobs for tomorrow that haven't been confirmed yet
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStart = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
      const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000);
      
      console.log(`[send-work-order-confirmations] Fetching bulk jobs for ${tomorrowStart.toISOString()} to ${tomorrowEnd.toISOString()} without joins first`);
      
      // First get just the jobs data
      const { data: jobs, error: jobsError } = await supaAdmin
        .from('jobs')
        .select('*')
        .eq('business_id', businessId)
        .gte('starts_at', tomorrowStart.toISOString())
        .lt('starts_at', tomorrowEnd.toISOString())
        .is('confirmation_token', null);
      
      if (jobsError) {
        console.error(`[send-work-order-confirmations] Error fetching bulk jobs:`, jobsError);
        throw jobsError;
      }
      
      if (jobs && jobs.length > 0) {
        // Get all unique customer IDs and business ID
        const customerIds = [...new Set(jobs.map(job => job.customer_id))];
        
        // Fetch all customers in batch
        const { data: customers, error: customersError } = await supaAdmin
          .from('customers')
          .select('*')
          .in('id', customerIds);
        
        if (customersError) {
          console.error(`[send-work-order-confirmations] Error fetching customers:`, customersError);
          throw customersError;
        }
        
        // Fetch business data
        const { data: business, error: businessError } = await supaAdmin
          .from('businesses')
          .select('*')
          .eq('id', businessId)
          .single();
        
        if (businessError) {
          console.error(`[send-work-order-confirmations] Error fetching business:`, businessError);
          throw businessError;
        }
        
        // Create customer lookup map
        const customerMap = (customers || []).reduce((acc, customer) => {
          acc[customer.id] = customer;
          return acc;
        }, {});
        
        // Combine job data with customer and business data
        jobsToProcess = jobs.map(job => ({
          ...job,
          customers: customerMap[job.customer_id],
          businesses: business
        }));
      } else {
        jobsToProcess = [];
      }
    }

    console.log(`[send-work-order-confirmations] Found ${jobsToProcess.length} jobs to process`);

    const results = [];
    
    for (const job of jobsToProcess) {
      try {
        const confirmationToken = crypto.randomUUID();
        
        // Store confirmation token in job record
        console.log(`[send-work-order-confirmations] Updating job ${job.id} with confirmation token`);
        const { error: updateError } = await supaAdmin
          .from('jobs')
          .update({ confirmation_token: confirmationToken })
          .eq('id', job.id);
          
        if (updateError) {
          console.error(`[send-work-order-confirmations] Failed to update job ${job.id}:`, updateError);
          continue;
        }

        const startDateTime = new Date(job.starts_at);
        const endDateTime = job.ends_at ? new Date(job.ends_at) : null;
        
        const formattedDate = startDateTime.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        
        const formattedStartTime = startDateTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        const formattedEndTime = endDateTime ? endDateTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }) : null;

        const confirmationUrl = `${Deno.env.get('FRONTEND_URL')}/job-confirmation?token=${confirmationToken}`;
        
        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1f2937; font-size: 24px; margin: 0;">${job.businesses.name}</h1>
            </div>
            
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
              <h2 style="color: #1f2937; font-size: 20px; margin: 0 0 16px 0;">Service Appointment Scheduled</h2>
              
              <div style="margin-bottom: 16px;">
                <strong style="color: #374151;">Service:</strong> ${job.title || 'Service Appointment'}
              </div>
              
              <div style="margin-bottom: 16px;">
                <strong style="color: #374151;">Date:</strong> ${formattedDate}
              </div>
              
              <div style="margin-bottom: 16px;">
                <strong style="color: #374151;">Time:</strong> ${formattedStartTime}${formattedEndTime ? ` - ${formattedEndTime}` : ''}
              </div>
              
              ${job.address ? `
                <div style="margin-bottom: 16px;">
                  <strong style="color: #374151;">Address:</strong> ${job.address}
                </div>
              ` : ''}
              
              ${job.notes ? `
                <div>
                  <strong style="color: #374151;">Notes:</strong> ${job.notes}
                </div>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin: 32px 0;">
              <p style="color: #6b7280; margin-bottom: 24px;">
                Please confirm your appointment to help us serve you better.
              </p>
              
              <a href="${confirmationUrl}" 
                 style="display: inline-block; background: #3b82f6; color: white; text-decoration: none; padding: 12px 32px; border-radius: 6px; font-weight: 600;">
                Confirm Appointment
              </a>
            </div>
            
            <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
              <p>Need to reschedule or have questions?</p>
              ${job.businesses.phone ? `<p>Call us: ${job.businesses.phone}</p>` : ''}
              ${job.businesses.reply_to_email ? `<p>Email us: ${job.businesses.reply_to_email}</p>` : ''}
            </div>
          </div>
        `;

        const { error: emailError } = await resend.emails.send({
          from: job.businesses.reply_to_email || 'noreply@resend.dev',
          to: [job.customers.email],
          subject: `Appointment Confirmation - ${job.businesses.name}`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`[send-work-order-confirmations] Email error for job ${job.id}:`, emailError);
          results.push({ jobId: job.id, success: false, error: emailError.message });
        } else {
          console.log(`[send-work-order-confirmations] Email sent successfully for job ${job.id}`);
          results.push({ jobId: job.id, success: true });
        }
        
      } catch (error) {
        console.error(`[send-work-order-confirmations] Error processing job ${job.id}:`, error);
        results.push({ jobId: job.id, success: false, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${jobsToProcess.length} jobs`,
        results 
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
    
  } catch (error) {
    console.error('[send-work-order-confirmations] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

serve(handler);