import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";
import { createClerkClient } from "https://esm.sh/@clerk/backend@1.15.6";
import { corsHeaders, json } from "../_lib/auth.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
  db: { schema: 'public' }
});

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    
    console.log(`📨 [clerk-webhooks] Received webhook: ${type}`);

    switch (type) {
      case 'user.created': {
        await handleUserCreated(data);
        break;
      }
      
      case 'organization.created': {
        await handleOrganizationCreated(data);
        break;
      }
      
      case 'organizationMembership.created':
      case 'organizationMembership.updated':
      case 'organizationMembership.deleted': {
        await handleMembershipChange(type, data);
        break;
      }
      
      default:
        console.log(`ℹ️ [clerk-webhooks] Unhandled webhook type: ${type}`);
    }

    return json({ success: true });

  } catch (error) {
    console.error('❌ [clerk-webhooks] Error processing webhook:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
});

async function handleUserCreated(userData: any) {
  const clerkUserId = userData.id;
  const email = userData.email_addresses?.[0]?.email_address;
  const firstName = userData.first_name;
  const lastName = userData.last_name;
  const fullName = [firstName, lastName].filter(Boolean).join(' ');

  console.log(`👤 [clerk-webhooks] Processing user.created for: ${clerkUserId}`);

  // Check if user was created with organization context (via invite link)
  const orgContext = userData.unsafe_metadata?.signup_context;
  
  if (orgContext?.org_id && orgContext?.invite_token) {
    console.log(`🏢 [clerk-webhooks] User signed up with organization context: ${orgContext.org_id}`);
    
    // Find the invite and validate
    const { data: invite } = await supabase
      .from('invites')
      .select('*, businesses!inner(clerk_org_id)')
      .eq('token_hash', orgContext.invite_token_hash)
      .eq('email', email)
      .is('redeemed_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (invite && invite.businesses.clerk_org_id === orgContext.org_id) {
      // Create profile for the new user
      const { data: profile } = await supabase
        .from('profiles')
        .insert({
          clerk_user_id: clerkUserId,
          email: email.toLowerCase(),
          full_name: fullName
        })
        .select('id')
        .single();

      if (profile) {
        // Add user to the business as a worker (don't create new org/business)
        await supabase
          .from('business_members')
          .insert({
            business_id: invite.business_id,
            user_id: profile.id,
            role: invite.role,
            joined_at: new Date().toISOString(),
            joined_via_invite: true
          });

        // Mark invite as redeemed
        await supabase
          .from('invites')
          .update({ 
            redeemed_at: new Date().toISOString(),
            redeemed_by: profile.id
          })
          .eq('id', invite.id);

        console.log(`✅ [clerk-webhooks] User added to existing organization as ${invite.role}`);
        return;
      }
    }
  }

  // Default flow: Create new organization and business for the user
  try {
    // Create Clerk client using the static import
    const clerkClient = createClerkClient({
      secretKey: Deno.env.get("CLERK_SECRET_KEY")!
    });

    // Create Clerk organization
    const organization = await clerkClient.organizations.createOrganization({
      name: `${fullName || email.split('@')[0]}'s Business`,
      createdBy: clerkUserId
    });

    console.log(`🏢 [clerk-webhooks] Created Clerk organization: ${organization.id}`);

    // Create profile
    const { data: profile } = await supabase
      .from('profiles')
      .insert({
        clerk_user_id: clerkUserId,
        email: email.toLowerCase(),
        full_name: fullName
      })
      .select('id')
      .single();

    if (profile) {
      // Create business linked to Clerk organization
      const { data: business } = await supabase
        .from('businesses')
        .insert({
          owner_id: profile.id,
          name: organization.name,
          clerk_org_id: organization.id
        })
        .select('id')
        .single();

      if (business) {
        // Create owner membership
        await supabase
          .from('business_members')
          .insert({
            business_id: business.id,
            user_id: profile.id,
            role: 'owner',
            joined_at: new Date().toISOString()
          });

        // Set as default business
        await supabase
          .from('profiles')
          .update({ default_business_id: business.id })
          .eq('id', profile.id);

        console.log(`✅ [clerk-webhooks] Created business and organization for new user`);
      }
    }

  } catch (error) {
    console.error('❌ [clerk-webhooks] Failed to create organization:', error);
    // Fall back to creating regular business with Clerk org
    await createFallbackBusiness(clerkUserId, email, fullName);
  }
}

async function handleOrganizationCreated(orgData: any) {
  console.log(`🏢 [clerk-webhooks] Organization created: ${orgData.id}`);
  
  // Organizations are typically created via user.created handler
  // This handler mainly exists for completeness
}

async function handleMembershipChange(type: string, membershipData: any) {
  const clerkOrgId = membershipData.organization.id;
  const clerkUserId = membershipData.public_user_data.user_id;
  const role = membershipData.role === 'org:admin' ? 'owner' : 'worker';

  console.log(`👥 [clerk-webhooks] Membership ${type} for org: ${clerkOrgId}, user: ${clerkUserId}`);

  // Find the business associated with this Clerk organization
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('clerk_org_id', clerkOrgId)
    .maybeSingle();

  if (!business) {
    console.warn(`⚠️ [clerk-webhooks] No business found for Clerk org: ${clerkOrgId}`);
    return;
  }

  // Find the user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', clerkUserId)
    .maybeSingle();

  if (!profile) {
    console.warn(`⚠️ [clerk-webhooks] No profile found for Clerk user: ${clerkUserId}`);
    return;
  }

  if (type === 'organizationMembership.created' || type === 'organizationMembership.updated') {
    // Sync membership to business_members
    await supabase
      .from('business_members')
      .upsert({
        business_id: business.id,
        user_id: profile.id,
        role,
        joined_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,business_id'
      });
  } else if (type === 'organizationMembership.deleted') {
    // Remove membership
    await supabase
      .from('business_members')
      .delete()
      .eq('business_id', business.id)
      .eq('user_id', profile.id);
  }

  console.log(`✅ [clerk-webhooks] Synced membership change to database`);
}

async function createFallbackBusiness(clerkUserId: string, email: string, fullName?: string) {
  console.log(`🔄 [clerk-webhooks] Creating fallback business with basic Clerk integration`);

  const { data: profile } = await supabase
    .from('profiles')
    .insert({
      clerk_user_id: clerkUserId,
      email: email.toLowerCase(),
      full_name: fullName
    })
    .select('id')
    .single();

  if (profile) {
    const { data: business } = await supabase
      .from('businesses')
      .insert({
        owner_id: profile.id,
        name: 'My Business'
      })
      .select('id')
      .single();

    if (business) {
      await supabase
        .from('business_members')
        .insert({
          business_id: business.id,
          user_id: profile.id,
          role: 'owner',
          joined_at: new Date().toISOString()
        });

      await supabase
        .from('profiles')
        .update({ default_business_id: business.id })
        .eq('id', profile.id);

      console.log(`✅ [clerk-webhooks] Created fallback business`);
    }
  }
}