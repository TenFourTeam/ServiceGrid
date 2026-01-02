# Clerk + Supabase RLS Integration Setup

This document outlines the steps to integrate Clerk authentication with Supabase RLS policies.

## Step 1: Configure Clerk as Third-Party Auth Provider in Supabase

### 1.1 Get Clerk JWKS URL
From your Clerk Dashboard:
- Go to **Configure** → **JWT Templates**
- Create a new template called "supabase" (if not exists)
- Copy the JWKS URL (format: `https://clerk.your-domain.com/.well-known/jwks.json`)

### 1.2 Configure Supabase Auth Providers
In your Supabase Dashboard:
1. Go to **Authentication** → **Providers**
2. Scroll to **Third-party Auth** section
3. Click **Add Provider**
4. Select **JWT**
5. Configure:
   - **Name**: `clerk`
   - **JWKS URL**: Your Clerk JWKS URL from step 1.1
   - **JWT Secret**: Leave empty (using JWKS)
   - **Issuer**: `https://clerk.your-domain.com` (replace with your actual domain)
   - **Audience**: Leave empty or set to your app identifier

## Step 2: Update Clerk JWT Template

In Clerk Dashboard:
1. Go to **Configure** → **JWT Templates**
2. Edit the "supabase" template
3. Set the claims to:
```json
{
  "aud": "authenticated",
  "exp": {{exp}},
  "iat": {{iat}},
  "iss": "https://clerk.your-domain.com",
  "sub": "{{user.id}}"
}
```

## Step 3: Test Configuration

Once configured, test by:
1. Logging in with Clerk
2. Making a query to a table with RLS enabled
3. Check Supabase logs for JWT verification success

## Step 4: Gradual RLS Migration

Start with one table (e.g., `customers`):
1. Enable RLS if not already enabled
2. Create policies using `auth.uid()`
3. Test thoroughly before enabling on other tables

## Common Issues

- **JWT verification failed**: Check JWKS URL and issuer match
- **No rows returned**: Ensure RLS policies use correct user mapping
- **Token not found**: Check that `getToken({ template: 'supabase' })` is working

## Security Notes

- Clerk JWTs are short-lived and auto-refresh
- RLS policies will automatically use Clerk's user ID
- Edge functions continue to use service role for complex operations