import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "*",
};

interface CompleteProfileEmailRequest {
  clerkUserId: string;
  profileId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { clerkUserId, profileId }: CompleteProfileEmailRequest = await req.json();
    
    if (!clerkUserId || !profileId) {
      return new Response(
        JSON.stringify({ error: "clerkUserId and profileId are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`🔄 [complete-profile-email] Starting email completion for Clerk user: ${clerkUserId}`);

    // Get Clerk secret key
    const clerkSecretKey = Deno.env.get("CLERK_SECRET_KEY");
    if (!clerkSecretKey) {
      console.error("❌ [complete-profile-email] CLERK_SECRET_KEY not found");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch user data from Clerk
    console.log(`📡 [complete-profile-email] Fetching user data from Clerk for: ${clerkUserId}`);
    const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: {
        "Authorization": `Bearer ${clerkSecretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!clerkResponse.ok) {
      const errorText = await clerkResponse.text();
      console.error(`❌ [complete-profile-email] Clerk API error: ${clerkResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ 
          error: "Failed to fetch user data from Clerk",
          details: `Status: ${clerkResponse.status}`
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const clerkUser = await clerkResponse.json();
    console.log(`📧 [complete-profile-email] Retrieved user data from Clerk`);

    // Extract email addresses
    const primaryEmail = clerkUser.primary_email_address_id;
    const emailAddresses = clerkUser.email_addresses || [];
    const primaryEmailObj = emailAddresses.find((email: any) => email.id === primaryEmail);
    const userEmail = primaryEmailObj?.email_address || emailAddresses[0]?.email_address;

    if (!userEmail) {
      console.warn(`⚠️ [complete-profile-email] No email found for Clerk user: ${clerkUserId}`);
      return new Response(
        JSON.stringify({ 
          error: "No email address found for user",
          clerkUserId 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`✅ [complete-profile-email] Found email for user: ${userEmail}`);

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      console.error("❌ [complete-profile-email] Supabase configuration missing");
      return new Response(
        JSON.stringify({ error: "Supabase configuration missing" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Update the profile with the email
    console.log(`🔄 [complete-profile-email] Updating profile ${profileId} with email: ${userEmail}`);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ 
        email: userEmail.toLowerCase(),
        updated_at: new Date().toISOString()
      })
      .eq("id", profileId);

    if (updateError) {
      console.error("❌ [complete-profile-email] Failed to update profile:", updateError);
      return new Response(
        JSON.stringify({ 
          error: "Failed to update profile with email",
          details: updateError.message 
        }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`✅ [complete-profile-email] Successfully updated profile ${profileId} with email: ${userEmail}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        profileId,
        email: userEmail,
        message: "Profile email completed successfully"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: any) {
    console.error("❌ [complete-profile-email] Unexpected error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: error.message 
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);