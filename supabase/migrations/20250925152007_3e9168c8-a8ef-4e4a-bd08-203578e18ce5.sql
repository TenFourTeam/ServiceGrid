-- =====================================================
-- COMPLETE CLEANUP: Use CASCADE to drop everything cleanly
-- =====================================================

-- Step 1: Drop problematic functions using CASCADE (this will drop all dependent policies)
DROP FUNCTION IF EXISTS public.current_clerk_user_id() CASCADE;
DROP FUNCTION IF EXISTS public.current_user_profile_id() CASCADE;

-- Step 2: Create only essential RLS policies that work without problematic functions

-- Profiles: Only allow service role to manage (edge functions handle validation)
-- Drop existing policy first if it exists
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
CREATE POLICY "Service role can manage profiles" 
ON public.profiles 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Business members: Simplified policies for basic access
DROP POLICY IF EXISTS "Users can view business memberships" ON public.business_members;
CREATE POLICY "Users can view business memberships" 
ON public.business_members 
FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Service role can manage business memberships" ON public.business_members;
CREATE POLICY "Service role can manage business memberships" 
ON public.business_members 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- All other tables: Service role only (edge functions handle all validation)
DROP POLICY IF EXISTS "Service role can manage mail sends" ON public.mail_sends;
CREATE POLICY "Service role can manage mail sends" 
ON public.mail_sends 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage quote events" ON public.quote_events;
CREATE POLICY "Service role can manage quote events" 
ON public.quote_events 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage job assignments" ON public.job_assignments;
CREATE POLICY "Service role can manage job assignments" 
ON public.job_assignments 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage timesheet entries" ON public.timesheet_entries;
CREATE POLICY "Service role can manage timesheet entries" 
ON public.timesheet_entries 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can manage subscribers" ON public.subscribers;
CREATE POLICY "Service role can manage subscribers" 
ON public.subscribers 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert businesses" ON public.businesses;
CREATE POLICY "Service role can insert businesses" 
ON public.businesses 
FOR INSERT 
TO service_role 
WITH CHECK (true);