// Business user authentication edge function
// Handles: login, register, magic-link, verify-magic, session, logout, password-reset, refresh
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  // Clone request so we can read body twice if needed
  const clonedReq = req.clone();
  
  // Determine action from body or URL path
  let action: string | null = null;
  let bodyData: any = {};
  
  try {
    bodyData = await clonedReq.json();
    action = bodyData.action || null;
  } catch {
    // No JSON body or invalid JSON
  }
  
  // Fall back to URL path if no action in body
  if (!action) {
    const url = new URL(req.url);
    action = url.pathname.split('/').pop() || null;
  }

  console.log(`[business-auth] ${req.method} action=${action}`);

  // Create a new request-like object that returns the already-parsed body
  const reqWithBody = {
    ...req,
    headers: req.headers,
    json: async () => bodyData,
  } as Request;

  try {
    switch (action) {
      case 'login':
        return await handleLogin(reqWithBody, supabase);
      case 'register':
        return await handleRegister(reqWithBody, supabase);
      case 'magic-link':
        return await handleMagicLink(reqWithBody, supabase);
      case 'verify-magic':
        return await handleVerifyMagic(reqWithBody, supabase);
      case 'session':
        return await handleSession(reqWithBody, supabase);
      case 'logout':
        return await handleLogout(reqWithBody, supabase);
      case 'refresh':
        return await handleRefresh(reqWithBody, supabase);
      case 'password-reset':
        return await handlePasswordReset(reqWithBody, supabase);
      case 'password-reset-confirm':
        return await handlePasswordResetConfirm(reqWithBody, supabase);
      default:
        return jsonResponse({ error: 'Unknown endpoint' }, 404);
    }
  } catch (error) {
    console.error('[business-auth] Error:', error);
    return jsonResponse({ error: error.message || 'Internal server error' }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Get IP and user agent from request
function getRequestMeta(req: Request) {
  return {
    ip: req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('cf-connecting-ip') || null,
    userAgent: req.headers.get('user-agent') || null,
  };
}

// Create session for a profile
async function createSession(supabase: any, profileId: string, authMethod: string, req: Request) {
  const { ip, userAgent } = getRequestMeta(req);
  
  const { data: session, error } = await supabase
    .from('business_sessions')
    .insert({
      profile_id: profileId,
      auth_method: authMethod,
      ip_address: ip,
      user_agent: userAgent,
    })
    .select('session_token, refresh_token, expires_at, refresh_expires_at')
    .single();

  if (error) {
    console.error('[business-auth] Failed to create session:', error);
    throw new Error('Failed to create session');
  }

  // Update last login
  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', profileId);

  return session;
}

// Get profile with business info
async function getProfileWithBusiness(supabase: any, profileId: string) {
  // Query profile without foreign key join - use actual columns from profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone_e164, created_at, last_login_at, default_business_id')
    .eq('id', profileId)
    .single();

  if (profileError) {
    console.error('[business-auth] Failed to fetch profile:', profileError);
    throw new Error('Failed to load profile data');
  }

  // Query owned businesses separately
  const { data: ownedBusinesses } = await supabase
    .from('businesses')
    .select('id, name, logo_url, light_logo_url')
    .eq('owner_id', profileId);

  // Query businesses they have permissions to (as team member)
  const { data: permissions } = await supabase
    .from('business_permissions')
    .select('business_id, businesses(id, name, logo_url)')
    .eq('user_id', profileId);

  return {
    ...profile,
    businesses: ownedBusinesses || [],
    member_businesses: permissions?.map(p => p.businesses).filter(Boolean) || [],
  };
}

// Create a default business for a new user
async function createBusinessForUser(supabase: any, profileId: string, userName: string) {
  const businessName = userName ? `${userName}'s Business` : 'My Business';
  
  console.log('[business-auth] Creating business for user:', profileId, businessName);
  
  const { data: business, error } = await supabase
    .from('businesses')
    .insert({
      owner_id: profileId,
      name: businessName,
      name_customized: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[business-auth] Failed to create business:', error);
    return null;
  }

  // Update profile with default_business_id
  await supabase
    .from('profiles')
    .update({ default_business_id: business.id })
    .eq('id', profileId);

  // Add business permission for owner
  await supabase
    .from('business_permissions')
    .insert({
      business_id: business.id,
      user_id: profileId,
      granted_by: profileId,
    });

  console.log('[business-auth] Created business:', business.id);
  return business;
}

// === LOGIN ===
async function handleLogin(req: Request, supabase: any) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return jsonResponse({ error: 'Email and password are required' }, 400);
  }

  // Find profile by email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, password_hash, full_name')
    .eq('email', email.toLowerCase())
    .single();

  if (profileError || !profile) {
    console.log('[business-auth] Login failed - profile not found:', email);
    return jsonResponse({ error: 'Invalid email or password' }, 401);
  }

  if (!profile.password_hash) {
    return jsonResponse({ 
      error: 'No password set for this account. Please use magic link or set a password.',
      hint: 'no_password'
    }, 401);
  }

  // Verify password
  const validPassword = bcrypt.compareSync(password, profile.password_hash);
  if (!validPassword) {
    console.log('[business-auth] Login failed - invalid password:', email);
    return jsonResponse({ error: 'Invalid email or password' }, 401);
  }

  // Create session
  const session = await createSession(supabase, profile.id, 'password', req);
  const fullProfile = await getProfileWithBusiness(supabase, profile.id);

  console.log('[business-auth] Login successful:', email);

  return jsonResponse({
    success: true,
    session_token: session.session_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    profile: fullProfile,
  });
}

// === REGISTER ===
async function handleRegister(req: Request, supabase: any) {
  const { email, password, full_name } = await req.json();

  if (!email || !password) {
    return jsonResponse({ error: 'Email and password are required' }, 400);
  }

  if (password.length < 8) {
    return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
  }

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, password_hash')
    .eq('email', email.toLowerCase())
    .single();

  if (existingProfile) {
    if (existingProfile.password_hash) {
      return jsonResponse({ error: 'Account already exists. Please login instead.' }, 409);
    }
    // Profile exists but no password - update it
      const passwordHash = bcrypt.hashSync(password);
    
    await supabase
      .from('profiles')
      .update({ 
        password_hash: passwordHash,
        full_name: full_name || existingProfile.full_name,
        email_verified_at: new Date().toISOString(),
      })
      .eq('id', existingProfile.id);

    // Check if existing profile needs a business
    const { data: existingBusiness } = await supabase
      .from('businesses')
      .select('id')
      .eq('owner_id', existingProfile.id)
      .single();

    if (!existingBusiness) {
      await createBusinessForUser(supabase, existingProfile.id, full_name || '');
    }

    const session = await createSession(supabase, existingProfile.id, 'password', req);
    const fullProfile = await getProfileWithBusiness(supabase, existingProfile.id);

    return jsonResponse({
      success: true,
      session_token: session.session_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      profile: fullProfile,
    });
  }

  // Create new profile
    const passwordHash = bcrypt.hashSync(password);

  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      full_name: full_name || '',
      email_verified_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (createError) {
    console.error('[business-auth] Failed to create profile:', createError);
    return jsonResponse({ error: 'Failed to create account' }, 500);
  }

  // Create a business for the new user
  await createBusinessForUser(supabase, newProfile.id, full_name || '');

  // Create session
  const session = await createSession(supabase, newProfile.id, 'password', req);
  const fullProfile = await getProfileWithBusiness(supabase, newProfile.id);

  console.log('[business-auth] Registration successful:', email);

  return jsonResponse({
    success: true,
    session_token: session.session_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    profile: fullProfile,
  });
}

// === MAGIC LINK ===
async function handleMagicLink(req: Request, supabase: any) {
  const { email, redirect_url } = await req.json();

  if (!email) {
    return jsonResponse({ error: 'Email is required' }, 400);
  }

  // Find or create profile
  let { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email.toLowerCase())
    .single();

  if (!profile) {
    // Create new profile for magic link user
    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({ email: email.toLowerCase() })
      .select('id, email, full_name')
      .single();

    if (error) {
      console.error('[business-auth] Failed to create profile:', error);
      return jsonResponse({ error: 'Failed to process request' }, 500);
    }
    profile = newProfile;
  }

  // Generate magic token
  const magicToken = crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await supabase
    .from('profiles')
    .update({
      magic_token: magicToken,
      magic_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', profile.id);

  // Send email
  const baseUrl = redirect_url || 'https://servicegrid.app';
  const magicLinkUrl = `${baseUrl}/auth/verify/${magicToken}`;

  let emailSent = false;

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
          subject: 'Sign in to ServiceGrid',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Sign in to ServiceGrid</h2>
              <p>Click the button below to sign in:</p>
              <a href="${magicLinkUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Sign In
              </a>
              <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        }),
      });

      emailSent = emailResponse.ok;
      if (!emailSent) {
        console.error('[business-auth] Email send failed:', await emailResponse.text());
      }
    } catch (err) {
      console.error('[business-auth] Email error:', err);
    }
  } else {
    console.log('[business-auth] No RESEND_API_KEY, magic link URL:', magicLinkUrl);
  }

  return jsonResponse({
    success: true,
    emailSent,
    message: emailSent 
      ? 'Magic link sent to your email.'
      : 'Could not send email. Please try again.',
  });
}

// === VERIFY MAGIC TOKEN ===
async function handleVerifyMagic(req: Request, supabase: any) {
  const { token } = await req.json();

  if (!token) {
    return jsonResponse({ error: 'Token is required' }, 400);
  }

  // Find profile by magic token
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, magic_token_expires_at')
    .eq('magic_token', token)
    .single();

  if (error || !profile) {
    return jsonResponse({ error: 'Invalid or expired magic link' }, 401);
  }

  // Check expiry
  if (new Date(profile.magic_token_expires_at) < new Date()) {
    return jsonResponse({ error: 'Magic link has expired' }, 401);
  }

  // Clear magic token and mark email verified
  await supabase
    .from('profiles')
    .update({
      magic_token: null,
      magic_token_expires_at: null,
      email_verified_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  // Create session
  const session = await createSession(supabase, profile.id, 'magic_link', req);
  const fullProfile = await getProfileWithBusiness(supabase, profile.id);

  console.log('[business-auth] Magic link verified:', profile.email);

  return jsonResponse({
    success: true,
    session_token: session.session_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    profile: fullProfile,
  });
}

// === VALIDATE SESSION ===
async function handleSession(req: Request, supabase: any) {
  const sessionToken = req.headers.get('x-session-token');

  if (!sessionToken) {
    return jsonResponse({ error: 'Session token required' }, 401);
  }

  // Find session
  const { data: session, error } = await supabase
    .from('business_sessions')
    .select('id, profile_id, expires_at, auth_method')
    .eq('session_token', sessionToken)
    .single();

  if (error || !session) {
    return jsonResponse({ error: 'Invalid session' }, 401);
  }

  // Check expiry
  if (new Date(session.expires_at) < new Date()) {
    return jsonResponse({ error: 'Session expired', hint: 'refresh_required' }, 401);
  }

  // Update last used
  await supabase
    .from('business_sessions')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', session.id);

  // Get profile
  const fullProfile = await getProfileWithBusiness(supabase, session.profile_id);

  if (!fullProfile) {
    return jsonResponse({ error: 'Profile not found' }, 401);
  }

  return jsonResponse({
    valid: true,
    profile: fullProfile,
    auth_method: session.auth_method,
  });
}

// === LOGOUT ===
async function handleLogout(req: Request, supabase: any) {
  const sessionToken = req.headers.get('x-session-token');
  const { all } = await req.json().catch(() => ({}));

  if (!sessionToken) {
    return jsonResponse({ success: true }); // Already logged out
  }

  if (all) {
    // Find profile from session and delete all sessions
    const { data: session } = await supabase
      .from('business_sessions')
      .select('profile_id')
      .eq('session_token', sessionToken)
      .single();

    if (session) {
      await supabase
        .from('business_sessions')
        .delete()
        .eq('profile_id', session.profile_id);
    }
  } else {
    // Just delete this session
    await supabase
      .from('business_sessions')
      .delete()
      .eq('session_token', sessionToken);
  }

  return jsonResponse({ success: true });
}

// === REFRESH SESSION ===
async function handleRefresh(req: Request, supabase: any) {
  const { refresh_token } = await req.json();

  if (!refresh_token) {
    return jsonResponse({ error: 'Refresh token required' }, 400);
  }

  // Find session by refresh token
  const { data: session, error } = await supabase
    .from('business_sessions')
    .select('id, profile_id, refresh_expires_at')
    .eq('refresh_token', refresh_token)
    .single();

  if (error || !session) {
    return jsonResponse({ error: 'Invalid refresh token' }, 401);
  }

  // Check refresh expiry
  if (new Date(session.refresh_expires_at) < new Date()) {
    // Delete the session
    await supabase
      .from('business_sessions')
      .delete()
      .eq('id', session.id);
    return jsonResponse({ error: 'Refresh token expired. Please login again.' }, 401);
  }

  // Generate new tokens
  const newSessionToken = crypto.randomUUID() + '-' + crypto.randomUUID().split('-')[0];
  const newRefreshToken = crypto.randomUUID() + '-' + crypto.randomUUID();
  const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const newRefreshExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await supabase
    .from('business_sessions')
    .update({
      session_token: newSessionToken,
      refresh_token: newRefreshToken,
      expires_at: newExpiry.toISOString(),
      refresh_expires_at: newRefreshExpiry.toISOString(),
      last_used_at: new Date().toISOString(),
    })
    .eq('id', session.id);

  const fullProfile = await getProfileWithBusiness(supabase, session.profile_id);

  return jsonResponse({
    success: true,
    session_token: newSessionToken,
    refresh_token: newRefreshToken,
    expires_at: newExpiry.toISOString(),
    profile: fullProfile,
  });
}

// === PASSWORD RESET REQUEST ===
async function handlePasswordReset(req: Request, supabase: any) {
  const { email, redirect_url } = await req.json();

  if (!email) {
    return jsonResponse({ error: 'Email is required' }, 400);
  }

  // Find profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email.toLowerCase())
    .single();

  if (!profile) {
    // Don't reveal if email exists
    return jsonResponse({ 
      success: true, 
      message: 'If an account exists, a password reset link has been sent.' 
    });
  }

  // Generate reset token (reuse magic_token field)
  const resetToken = 'reset-' + crypto.randomUUID() + '-' + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await supabase
    .from('profiles')
    .update({
      magic_token: resetToken,
      magic_token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', profile.id);

  // Send email
  const baseUrl = redirect_url || 'https://servicegrid.app';
  const resetUrl = `${baseUrl}/auth/reset/${resetToken}`;

  let emailSent = false;

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
          subject: 'Reset your ServiceGrid password',
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Reset your password</h2>
              <p>Click the button below to set a new password:</p>
              <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                Reset Password
              </a>
              <p style="color: #666; font-size: 14px;">This link expires in 1 hour.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        }),
      });

      emailSent = emailResponse.ok;
    } catch (err) {
      console.error('[business-auth] Password reset email error:', err);
    }
  }

  return jsonResponse({
    success: true,
    emailSent,
    message: 'If an account exists, a password reset link has been sent.',
  });
}

// === PASSWORD RESET CONFIRM ===
async function handlePasswordResetConfirm(req: Request, supabase: any) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return jsonResponse({ error: 'Token and password are required' }, 400);
  }

  if (password.length < 8) {
    return jsonResponse({ error: 'Password must be at least 8 characters' }, 400);
  }

  // Find profile by reset token
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, email, magic_token_expires_at')
    .eq('magic_token', token)
    .single();

  if (error || !profile) {
    return jsonResponse({ error: 'Invalid or expired reset link' }, 401);
  }

  // Check expiry
  if (new Date(profile.magic_token_expires_at) < new Date()) {
    return jsonResponse({ error: 'Reset link has expired' }, 401);
  }

  // Update password
  const passwordHash = bcrypt.hashSync(password);

  await supabase
    .from('profiles')
    .update({
      password_hash: passwordHash,
      magic_token: null,
      magic_token_expires_at: null,
      email_verified_at: new Date().toISOString(),
    })
    .eq('id', profile.id);

  // Invalidate all existing sessions
  await supabase
    .from('business_sessions')
    .delete()
    .eq('profile_id', profile.id);

  // Create new session
  const session = await createSession(supabase, profile.id, 'password_reset', req);
  const fullProfile = await getProfileWithBusiness(supabase, profile.id);

  console.log('[business-auth] Password reset successful:', profile.email);

  return jsonResponse({
    success: true,
    session_token: session.session_token,
    refresh_token: session.refresh_token,
    expires_at: session.expires_at,
    profile: fullProfile,
  });
}
