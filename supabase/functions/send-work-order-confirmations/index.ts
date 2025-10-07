import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { requireCtx, corsHeaders } from "../_lib/auth.ts";
import { generateWorkOrderConfirmationEmail } from "../_shared/workOrderConfirmationTemplate.ts";

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
        const customerIds = [...new Set(jobs.map((job: any) => job.customer_id))];
        
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
        const customerMap = (customers || []).reduce((acc: any, customer: any) => {
          acc[customer.id] = customer;
          return acc;
        }, {});
        
        // Combine job data with customer and business data
        jobsToProcess = jobs.map((job: any) => ({
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
              .update({ 
                confirmation_token: confirmationToken,
                confirmation_status: 'pending'
              })
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
        
        // Generate email using shared template
        const { subject, html: emailHtml } = generateWorkOrderConfirmationEmail({
          businessName: job.businesses.name,
          businessPhone: job.businesses.phone,
          businessEmail: job.businesses.reply_to_email,
          jobTitle: job.title || 'Service Appointment',
          formattedDate,
          formattedStartTime,
          formattedEndTime,
          address: job.address,
          notes: job.notes,
          confirmationUrl,
        });

        // Send email via Resend API
        const resendApiKey = Deno.env.get('RESEND_API_KEY');
        if (!resendApiKey) {
          throw new Error('RESEND_API_KEY not configured');
        }

        let emailError = null;
        let providerMessageId = null;
        try {
          const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: `${job.businesses.name} <${Deno.env.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev'}>`,
              to: [job.customers.email],
              subject,
              html: emailHtml,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            emailError = new Error(errorData.message || 'Failed to send email');
            console.error(`[send-work-order-confirmations] Resend API error:`, errorData);
          } else {
            const result = await response.json();
            providerMessageId = result.id;
            console.log(`[send-work-order-confirmations] Email sent successfully:`, result);
          }
        } catch (error) {
          emailError = error;
          console.error(`[send-work-order-confirmations] Email send error:`, error);
        }

        // Log to mail_sends table for tracking
        try {
          const requestHash = crypto.randomUUID();
          
          await supaAdmin
            .from('mail_sends')
            .insert({
              job_id: job.id,
              to_email: job.customers.email,
              subject,
              status: emailError ? 'failed' : 'sent',
              error_message: emailError ? (emailError as any)?.message : null,
              provider_message_id: providerMessageId,
              request_hash: requestHash,
              user_id: job.owner_id
            });
        } catch (logError) {
          console.error(`[send-work-order-confirmations] Failed to log to mail_sends:`, logError);
          // Don't fail the whole operation if logging fails
        }

        if (emailError) {
          console.error(`[send-work-order-confirmations] Email error for job ${job.id}:`, emailError);
          results.push({ jobId: job.id, success: false, error: (emailError as any)?.message || 'Unknown error' });
        } else {
          console.log(`[send-work-order-confirmations] Email sent successfully for job ${job.id}`);
          results.push({ jobId: job.id, success: true });
        }
        
      } catch (error) {
        console.error(`[send-work-order-confirmations] Error processing job ${job.id}:`, error);
        results.push({ jobId: job.id, success: false, error: (error as any)?.message || 'Unknown error' });
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
        error: (error as any)?.message || 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

serve(handler);