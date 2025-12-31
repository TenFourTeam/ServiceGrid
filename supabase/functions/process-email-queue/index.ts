import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("[process-email-queue] ===== Function Entry =====");
  console.log("[process-email-queue] Method:", req.method);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
  
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    console.error("[process-email-queue] RESEND_API_KEY not configured");
    return new Response(JSON.stringify({ error: "Email service not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  
  const resend = new Resend(resendApiKey);
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "noreply@servicegrid.app";

  try {
    // Get pending emails that are due
    const { data: pendingEmails, error } = await supabase
      .from("email_queue")
      .select(`
        *,
        customers(name),
        businesses(name, reply_to_email)
      `)
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .lt("attempts", 3)
      .order("scheduled_for", { ascending: true })
      .limit(10);

    if (error) {
      console.error("[process-email-queue] Error fetching queue:", error);
      throw error;
    }
    
    if (!pendingEmails?.length) {
      console.log("[process-email-queue] No pending emails to process");
      return new Response(JSON.stringify({ processed: 0, message: "No pending emails" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[process-email-queue] Processing ${pendingEmails.length} emails`);

    let processed = 0;
    let failed = 0;

    for (const email of pendingEmails) {
      console.log(`[process-email-queue] Processing email ${email.id} (type: ${email.email_type})`);
      
      // Mark as processing
      await supabase
        .from("email_queue")
        .update({ status: "processing", attempts: email.attempts + 1 })
        .eq("id", email.id);

      try {
        // Generate email content based on type
        let subject = email.subject;
        let html = email.body_template;

        if (email.email_type === "welcome") {
          const businessName = email.businesses?.name || "Our Team";
          const customerName = email.recipient_name || "there";
          
          subject = `Welcome to ${businessName}!`;
          html = generateWelcomeEmail(customerName, businessName);
        }

        console.log(`[process-email-queue] Sending email to ${email.recipient_email}`);

        // Send via Resend
        const result = await resend.emails.send({
          from: `${email.businesses?.name || "ServiceGrid"} <${fromEmail}>`,
          to: email.recipient_email,
          replyTo: email.businesses?.reply_to_email || undefined,
          subject: subject || "Message from your service provider",
          html: html || "<p>Hello!</p>"
        });

        console.log(`[process-email-queue] Email sent successfully:`, result);

        // Mark as sent
        await supabase
          .from("email_queue")
          .update({ 
            status: "sent", 
            processed_at: new Date().toISOString() 
          })
          .eq("id", email.id);

        processed++;
      } catch (sendError: any) {
        console.error(`[process-email-queue] Failed to send email ${email.id}:`, sendError);
        
        // Mark as failed or back to pending for retry
        await supabase
          .from("email_queue")
          .update({ 
            status: email.attempts >= 2 ? "failed" : "pending",
            error_message: sendError.message || "Unknown error"
          })
          .eq("id", email.id);

        failed++;
      }
    }

    console.log(`[process-email-queue] Done. Processed: ${processed}, Failed: ${failed}`);

    return new Response(JSON.stringify({ 
      processed, 
      failed,
      total: pendingEmails.length 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    console.error("[process-email-queue] Unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});

function generateWelcomeEmail(customerName: string, businessName: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
      <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        <h1 style="color: #1e293b; margin-top: 0; font-size: 24px;">Welcome, ${customerName}!</h1>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Thank you for choosing <strong>${businessName}</strong>. We're excited to work with you!
        </p>
        <p style="color: #475569; font-size: 16px; line-height: 1.6;">
          Our team will be in touch shortly to discuss your service needs and how we can help.
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 14px; color: #94a3b8; margin-bottom: 0;">
          Best regards,<br>
          <strong>The ${businessName} Team</strong>
        </p>
      </div>
    </body>
    </html>
  `;
}
