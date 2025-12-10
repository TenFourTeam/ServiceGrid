import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    switch (path) {
      case 'magic-link':
        return await handleMagicLink(req, supabase);
      case 'verify-magic':
        return await handleVerifyMagic(req, supabase);
      case 'register':
        return await handleRegister(req, supabase);
      case 'login':
        return await handleLogin(req, supabase);
      case 'logout':
        return await handleLogout(req, supabase);
      case 'session':
        return await handleSession(req, supabase);
      case 'clerk-link':
        return await handleClerkLink(req, supabase);
      case 'clerk-verify':
        return await handleClerkVerify(req, supabase);
      case 'password-reset':
        return await handlePasswordReset(req, supabase);
      case 'password-reset-confirm':
        return await handlePasswordResetConfirm(req, supabase);
      default:
        return new Response(
          JSON.stringify({ error: 'Unknown endpoint' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Customer auth error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: Get available businesses for a customer account
async function getAvailableBusinesses(supabase: any, accountId: string) {
  const { data: links, error } = await supabase
    .from('customer_account_links')
    .select(`
      customer_id,
      business_id,
      is_primary,
      customers (id, name, email),
      businesses (id, name, logo_url, light_logo_url)
    `)
    .eq('customer_account_id', accountId)
    .order('is_primary', { ascending: false });

  if (error) {
    console.error('Error fetching customer account links:', error);
    return [];
  }

  return (links || []).map(link => ({
    id: link.business_id,
    name: link.businesses?.name || 'Unknown Business',
    logo_url: link.businesses?.logo_url,
    light_logo_url: link.businesses?.light_logo_url,
    customer_id: link.customer_id,
    customer_name: link.customers?.name,
    is_primary: link.is_primary,
  }));
}

// Helper: Determine default active business/customer for a session
function getDefaultActiveContext(availableBusinesses: any[], fallbackCustomerId: string, fallbackBusinessId: string) {
  if (availableBusinesses.length > 0) {
    const primary = availableBusinesses.find(b => b.is_primary) || availableBusinesses[0];
    return {
      activeCustomerId: primary.customer_id,
      activeBusinessId: primary.id,
    };
  }
  return {
    activeCustomerId: fallbackCustomerId,
    activeBusinessId: fallbackBusinessId,
  };
}

// Generate magic link and send email
async function handleMagicLink(req: Request, supabase: any) {
  const { email, redirect_url } = await req.json();

  if (!email) {
    return new Response(
      JSON.stringify({ error: 'Email is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find customer by email (handle multiple customers with same email across businesses)
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id, name, email, business_id, updated_at, businesses(id, name)')
    .eq('email', email.toLowerCase())
    .order('updated_at', { ascending: false })
    .limit(10);

  if (customerError) {
    console.error('Error querying customers:', customerError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        emailSent: false,
        error: 'Failed to process request' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!customers || customers.length === 0) {
    console.log('No customer found for email:', email);
    // Return success but indicate no customer found (for security, don't reveal if email exists)
    return new Response(
      JSON.stringify({ 
        success: true, 
        emailSent: false,
        message: 'If an account exists, a magic link has been sent.',
        hint: 'no_customer'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Use the most recently updated customer record
  const customer = customers[0];
  console.log(`Found ${customers.length} customer(s) for email ${email}, using customer ${customer.id} from business ${customer.business_id}`);

  // Generate magic token
  const magicToken = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Upsert customer account
  const { data: account, error: accountError } = await supabase
    .from('customer_accounts')
    .upsert({
      customer_id: customer.id,
      email: email.toLowerCase(),
      magic_token: magicToken,
      magic_token_expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'customer_id',
    })
    .select()
    .single();

  if (accountError) {
    console.error('Error creating customer account:', accountError);
    return new Response(
      JSON.stringify({ 
        success: false, 
        emailSent: false,
        error: 'Failed to create magic link. Please try again.' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Send magic link email
  const baseUrl = redirect_url || 'https://servicegrid.app';
  const magicLinkUrl = `${baseUrl}/customer-magic/${magicToken}`;

  let emailSent = false;
  let emailError: string | null = null;

  if (resendApiKey) {
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ServiceGrid <noreply@servicegrid.app>',
          to: [email],
          subject: `Access your project portal - ${customer.businesses?.name || 'ServiceGrid'}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hi ${customer.name},</h2>
              <p>Click the button below to access your project portal:</p>
              <a href="${magicLinkUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                View Your Projects
              </a>
              <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
              <p style="color: #666; font-size: 14px;">Want easier access next time? Create a permanent account with Google or email after signing in.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #999; font-size: 12px;">${customer.businesses?.name || 'ServiceGrid'}</p>
            </div>
          `,
        }),
      });

      if (emailResponse.ok) {
        emailSent = true;
        console.log('Magic link email sent successfully to:', email);
      } else {
        const errorText = await emailResponse.text();
        console.error('Failed to send magic link email:', errorText);
        emailError = 'Email service temporarily unavailable';
      }
    } catch (err) {
      console.error('Email send error:', err);
      emailError = 'Failed to send email';
    }
  } else {
    console.log('RESEND_API_KEY not configured, magic link URL:', magicLinkUrl);
    emailError = 'Email service not configured';
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      emailSent,
      message: emailSent 
        ? 'Magic link sent to your email.' 
        : 'There was an issue sending the email. Please try again.',
      warning: !emailSent ? emailError : undefined,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Verify magic token and create session
async function handleVerifyMagic(req: Request, supabase: any) {
  const { token } = await req.json();

  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Token is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find account by magic token
  const { data: account, error: accountError } = await supabase
    .from('customer_accounts')
    .select('*, customers(*, businesses(id, name, logo_url))')
    .eq('magic_token', token)
    .single();

  if (accountError || !account) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired magic link' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if token expired
  if (new Date(account.magic_token_expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: 'Magic link has expired' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Clear magic token and update last login
  await supabase
    .from('customer_accounts')
    .update({
      magic_token: null,
      magic_token_expires_at: null,
      last_login_at: new Date().toISOString(),
      auth_method: 'magic_link',
    })
    .eq('id', account.id);

  // Mark any pending invites as accepted
  await supabase
    .from('customer_portal_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('customer_id', account.customer_id)
    .is('accepted_at', null);

  // Get available businesses for this account
  const availableBusinesses = await getAvailableBusinesses(supabase, account.id);
  const customer = account.customers;
  
  // Determine default active context
  const { activeCustomerId, activeBusinessId } = getDefaultActiveContext(
    availableBusinesses,
    customer.id,
    customer.business_id
  );

  // Create session with active business context
  const sessionToken = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const { data: session, error: sessionError } = await supabase
    .from('customer_sessions')
    .insert({
      customer_account_id: account.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      auth_method: 'magic_link',
      active_customer_id: activeCustomerId,
      active_business_id: activeBusinessId,
    })
    .select()
    .single();

  if (sessionError) {
    console.error('Error creating session:', sessionError);
    throw new Error('Failed to create session');
  }

  console.log(`[handleVerifyMagic] Session created with active_business_id: ${activeBusinessId}, active_customer_id: ${activeCustomerId}`);
  
  return new Response(
    JSON.stringify({
      success: true,
      session_token: sessionToken,
      customer_account: {
        id: account.id,
        customer_id: account.customer_id,
        email: account.email,
        auth_method: 'magic_link',
      },
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        business_id: customer.business_id,
        business: customer.businesses,
      },
      available_businesses: availableBusinesses,
      active_business_id: activeBusinessId,
      active_customer_id: activeCustomerId,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Register with password
async function handleRegister(req: Request, supabase: any) {
  const { email, password, invite_token } = await req.json();

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: 'Email and password are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (password.length < 8) {
    return new Response(
      JSON.stringify({ error: 'Password must be at least 8 characters' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find customer by email (handle multiple customers with same email across businesses)
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id, name, email, business_id, updated_at, businesses(id, name, logo_url)')
    .eq('email', email.toLowerCase())
    .order('updated_at', { ascending: false })
    .limit(10);

  if (customerError) {
    console.error('Error querying customers:', customerError);
    return new Response(
      JSON.stringify({ error: 'Failed to process request' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!customers || customers.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No customer account found with this email' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Use the most recently updated customer record
  const customer = customers[0];
  console.log(`Register: Found ${customers.length} customer(s) for email ${email}, using customer ${customer.id}`);

  // Check if account already has password
  const { data: existingAccount } = await supabase
    .from('customer_accounts')
    .select('id, password_hash')
    .eq('customer_id', customer.id)
    .single();

  if (existingAccount?.password_hash) {
    return new Response(
      JSON.stringify({ error: 'Account already has a password. Please login instead.' }),
      { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password);

  // Upsert customer account with password
  const { data: account, error: accountError } = await supabase
    .from('customer_accounts')
    .upsert({
      customer_id: customer.id,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      auth_method: 'password',
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'customer_id',
    })
    .select()
    .single();

  if (accountError) {
    console.error('Error creating customer account:', accountError);
    throw new Error('Failed to create account');
  }

  // Get available businesses for this account
  const availableBusinesses = await getAvailableBusinesses(supabase, account.id);
  
  // Determine default active context
  const { activeCustomerId, activeBusinessId } = getDefaultActiveContext(
    availableBusinesses,
    customer.id,
    customer.business_id
  );

  // Create session with active business context
  const sessionToken = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await supabase
    .from('customer_sessions')
    .insert({
      customer_account_id: account.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      auth_method: 'password',
      active_customer_id: activeCustomerId,
      active_business_id: activeBusinessId,
    });

  // Mark invite as accepted if provided
  if (invite_token) {
    await supabase
      .from('customer_portal_invites')
      .update({ accepted_at: new Date().toISOString() })
      .eq('invite_token', invite_token)
      .eq('customer_id', customer.id);
  }

  console.log(`[handleRegister] Session created with active_business_id: ${activeBusinessId}, active_customer_id: ${activeCustomerId}`);

  return new Response(
    JSON.stringify({
      success: true,
      session_token: sessionToken,
      customer_account: {
        id: account.id,
        customer_id: account.customer_id,
        email: account.email,
        auth_method: 'password',
      },
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        business_id: customer.business_id,
        business: customer.businesses,
      },
      available_businesses: availableBusinesses,
      active_business_id: activeBusinessId,
      active_customer_id: activeCustomerId,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Login with password
async function handleLogin(req: Request, supabase: any) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return new Response(
      JSON.stringify({ error: 'Email and password are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find account by email
  const { data: account, error: accountError } = await supabase
    .from('customer_accounts')
    .select('*, customers(*, businesses(id, name, logo_url))')
    .eq('email', email.toLowerCase())
    .single();

  if (accountError || !account || !account.password_hash) {
    return new Response(
      JSON.stringify({ error: 'Invalid email or password' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify password
  const validPassword = await bcrypt.compare(password, account.password_hash);
  if (!validPassword) {
    return new Response(
      JSON.stringify({ error: 'Invalid email or password' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update last login
  await supabase
    .from('customer_accounts')
    .update({
      last_login_at: new Date().toISOString(),
      auth_method: 'password',
    })
    .eq('id', account.id);

  // Mark any pending invites as accepted
  await supabase
    .from('customer_portal_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('customer_id', account.customer_id)
    .is('accepted_at', null);

  // Get available businesses for this account
  const availableBusinesses = await getAvailableBusinesses(supabase, account.id);
  const customer = account.customers;
  
  // Determine default active context
  const { activeCustomerId, activeBusinessId } = getDefaultActiveContext(
    availableBusinesses,
    customer.id,
    customer.business_id
  );

  // Create session with active business context
  const sessionToken = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await supabase
    .from('customer_sessions')
    .insert({
      customer_account_id: account.id,
      session_token: sessionToken,
      expires_at: expiresAt.toISOString(),
      auth_method: 'password',
      active_customer_id: activeCustomerId,
      active_business_id: activeBusinessId,
    });

  console.log(`[handleLogin] Session created with active_business_id: ${activeBusinessId}, active_customer_id: ${activeCustomerId}`);

  return new Response(
    JSON.stringify({
      success: true,
      session_token: sessionToken,
      customer_account: {
        id: account.id,
        customer_id: account.customer_id,
        email: account.email,
        auth_method: 'password',
      },
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        business_id: customer.business_id,
        business: customer.businesses,
      },
      available_businesses: availableBusinesses,
      active_business_id: activeBusinessId,
      active_customer_id: activeCustomerId,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Logout - invalidate session
async function handleLogout(req: Request, supabase: any) {
  const sessionToken = req.headers.get('x-session-token');

  if (!sessionToken) {
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  await supabase
    .from('customer_sessions')
    .delete()
    .eq('session_token', sessionToken);

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Validate session token
async function handleSession(req: Request, supabase: any) {
  const sessionToken = req.headers.get('x-session-token');

  if (!sessionToken) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find valid session
  const { data: session, error: sessionError } = await supabase
    .from('customer_sessions')
    .select('*, customer_accounts(*, customers(*, businesses(id, name, logo_url)))')
    .eq('session_token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (sessionError || !session) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const account = session.customer_accounts;
  const customer = account.customers;

  // Get available businesses for this account
  const availableBusinesses = await getAvailableBusinesses(supabase, account.id);

  // Use session's active context or fall back to defaults
  let activeBusinessId = session.active_business_id;
  let activeCustomerId = session.active_customer_id;
  
  if (!activeBusinessId || !activeCustomerId) {
    const defaults = getDefaultActiveContext(availableBusinesses, customer.id, customer.business_id);
    activeBusinessId = defaults.activeBusinessId;
    activeCustomerId = defaults.activeCustomerId;
    
    // Update session with defaults if they were missing
    await supabase
      .from('customer_sessions')
      .update({
        active_business_id: activeBusinessId,
        active_customer_id: activeCustomerId,
      })
      .eq('id', session.id);
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      session_token: sessionToken,
      customer_account: {
        id: account.id,
        customer_id: account.customer_id,
        email: account.email,
        auth_method: session.auth_method,
      },
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        business_id: customer.business_id,
        business: customer.businesses,
      },
      available_businesses: availableBusinesses,
      active_business_id: activeBusinessId,
      active_customer_id: activeCustomerId,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Link Clerk user to customer account
async function handleClerkLink(req: Request, supabase: any) {
  const { clerk_user_id, email } = await req.json();

  if (!clerk_user_id || !email) {
    return new Response(
      JSON.stringify({ error: 'Clerk user ID and email are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find customer by email (handle multiple customers with same email across businesses)
  const { data: customers, error: customerError } = await supabase
    .from('customers')
    .select('id, name, email, business_id, updated_at, businesses(id, name, logo_url)')
    .eq('email', email.toLowerCase())
    .order('updated_at', { ascending: false })
    .limit(10);

  if (customerError) {
    console.error('Error querying customers for Clerk link:', customerError);
    return new Response(
      JSON.stringify({ error: 'Failed to process request', linked: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!customers || customers.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No customer found with this email', linked: false }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Use the most recently updated customer record
  const customer = customers[0];
  console.log(`Clerk link: Found ${customers.length} customer(s) for email ${email}, using customer ${customer.id}`);

  // Upsert customer account with Clerk ID
  const { data: account, error: accountError } = await supabase
    .from('customer_accounts')
    .upsert({
      customer_id: customer.id,
      email: email.toLowerCase(),
      clerk_user_id: clerk_user_id,
      auth_method: 'clerk',
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'customer_id',
    })
    .select()
    .single();

  if (accountError) {
    console.error('Error linking Clerk account:', accountError);
    throw new Error('Failed to link account');
  }

  // Get available businesses for this account
  const availableBusinesses = await getAvailableBusinesses(supabase, account.id);

  return new Response(
    JSON.stringify({
      success: true,
      linked: true,
      customer_account: {
        id: account.id,
        customer_id: account.customer_id,
        email: account.email,
        clerk_user_id: account.clerk_user_id,
        auth_method: 'clerk',
      },
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        business_id: customer.business_id,
        business: customer.businesses,
      },
      available_businesses: availableBusinesses,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Verify Clerk JWT and return customer data
async function handleClerkVerify(req: Request, supabase: any) {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // For now, we trust the Clerk user info from the request
  // In production, verify the JWT with Clerk's public key
  const { clerk_user_id, email } = await req.json();

  if (!clerk_user_id) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find customer account by Clerk ID
  const { data: account, error: accountError } = await supabase
    .from('customer_accounts')
    .select('*, customers(*, businesses(id, name, logo_url))')
    .eq('clerk_user_id', clerk_user_id)
    .single();

  if (accountError || !account) {
    // Try to link by email if not found
    if (email) {
      const linkResponse = await handleClerkLink(
        new Request(req.url, {
          method: 'POST',
          headers: req.headers,
          body: JSON.stringify({ clerk_user_id, email }),
        }),
        supabase
      );
      return linkResponse;
    }

    return new Response(
      JSON.stringify({ authenticated: false, needs_linking: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Update last login
  await supabase
    .from('customer_accounts')
    .update({
      last_login_at: new Date().toISOString(),
    })
    .eq('id', account.id);

  const customer = account.customers;
  
  // Get available businesses for this account
  const availableBusinesses = await getAvailableBusinesses(supabase, account.id);

  return new Response(
    JSON.stringify({
      authenticated: true,
      customer_account: {
        id: account.id,
        customer_id: account.customer_id,
        email: account.email,
        clerk_user_id: account.clerk_user_id,
        auth_method: 'clerk',
      },
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address,
        business_id: customer.business_id,
        business: customer.businesses,
      },
      available_businesses: availableBusinesses,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Request password reset
async function handlePasswordReset(req: Request, supabase: any) {
  const { email } = await req.json();

  if (!email) {
    return new Response(
      JSON.stringify({ error: 'Email is required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find customer account by email
  const { data: account, error: accountError } = await supabase
    .from('customer_accounts')
    .select('*, customers(name, business_id, businesses(name))')
    .eq('email', email.toLowerCase())
    .single();

  // Always return success to prevent email enumeration
  if (accountError || !account) {
    console.log('Password reset requested for unknown email:', email);
    return new Response(
      JSON.stringify({ success: true, message: 'If an account exists, a reset link has been sent.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Generate reset token
  const resetToken = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Store reset token using magic_token fields
  await supabase
    .from('customer_accounts')
    .update({
      magic_token: `reset:${resetToken}`,
      magic_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', account.id);

  // Send reset email
  const resetUrl = `https://servicegrid.app/customer-reset-password/${resetToken}`;
  const customerName = account.customers?.name || 'Customer';
  const businessName = account.customers?.businesses?.name || 'ServiceGrid';

  if (resendApiKey) {
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ServiceGrid <noreply@servicegrid.app>',
          to: [email],
          subject: `Reset your password - ${businessName}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Hi ${customerName},</h2>
              <p>We received a request to reset your password for your customer portal account.</p>
              <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Reset Password
              </a>
              <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="color: #999; font-size: 12px;">${businessName}</p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send password reset email:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('Email send error:', emailError);
    }
  } else {
    console.log('RESEND_API_KEY not configured, reset URL:', resetUrl);
  }

  return new Response(
    JSON.stringify({ success: true, message: 'If an account exists, a reset link has been sent.' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Confirm password reset with new password
async function handlePasswordResetConfirm(req: Request, supabase: any) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return new Response(
      JSON.stringify({ error: 'Token and password are required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (password.length < 8) {
    return new Response(
      JSON.stringify({ error: 'Password must be at least 8 characters' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Find account by reset token
  const { data: account, error: accountError } = await supabase
    .from('customer_accounts')
    .select('id, email, magic_token_expires_at')
    .eq('magic_token', `reset:${token}`)
    .single();

  if (accountError || !account) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired reset link' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if token expired
  if (new Date(account.magic_token_expires_at) < new Date()) {
    return new Response(
      JSON.stringify({ error: 'Reset link has expired' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Hash new password
  const passwordHash = await bcrypt.hash(password);

  // Update password and clear reset token
  await supabase
    .from('customer_accounts')
    .update({
      password_hash: passwordHash,
      magic_token: null,
      magic_token_expires_at: null,
      auth_method: 'password',
      updated_at: new Date().toISOString(),
    })
    .eq('id', account.id);

  return new Response(
    JSON.stringify({ success: true, message: 'Password reset successfully' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
