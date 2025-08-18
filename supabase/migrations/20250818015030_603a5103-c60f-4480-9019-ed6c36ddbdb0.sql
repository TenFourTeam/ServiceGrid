-- Phase 1: Fix Foreign Key Constraints
-- Drop the incorrect foreign key constraint on business_members.invited_by
ALTER TABLE public.business_members DROP CONSTRAINT IF EXISTS business_members_invited_by_fkey;

-- Add correct foreign key constraint pointing to profiles table
ALTER TABLE public.business_members 
ADD CONSTRAINT business_members_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Phase 2: Update Database Functions to Use Profiles System
-- Update current_clerk_user_id function to be more robust
CREATE OR REPLACE FUNCTION public.current_clerk_user_id()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    ''
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path TO '';

-- Update is_business_member function to use profiles
CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members bm
    JOIN public.profiles p ON p.id = bm.user_id
    WHERE bm.business_id = p_business_id 
    AND p.clerk_user_id = public.current_clerk_user_id()
  );
$$;

-- Update can_manage_business function to use profiles
CREATE OR REPLACE FUNCTION public.can_manage_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT COALESCE(
    (SELECT bm.role FROM public.business_members bm
     JOIN public.profiles p ON p.id = bm.user_id
     WHERE bm.business_id = p_business_id 
     AND p.clerk_user_id = public.current_clerk_user_id()) = 'owner',
    false
  );
$$;

-- Update user_business_role function to use profiles
CREATE OR REPLACE FUNCTION public.user_business_role(p_business_id uuid)
RETURNS business_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT bm.role FROM public.business_members bm
  JOIN public.profiles p ON p.id = bm.user_id
  WHERE bm.business_id = p_business_id 
  AND p.clerk_user_id = public.current_clerk_user_id()
  LIMIT 1;
$$;

-- Update ensure_default_business function to use profiles
CREATE OR REPLACE FUNCTION public.ensure_default_business()
RETURNS businesses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  b public.businesses%ROWTYPE;
  user_profile_id uuid;
BEGIN
  -- Get the current user's profile ID
  SELECT id INTO user_profile_id 
  FROM public.profiles 
  WHERE clerk_user_id = public.current_clerk_user_id();
  
  IF user_profile_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found for current user';
  END IF;

  -- Look for existing business via membership (not ownership)
  SELECT b.*
  INTO b
  FROM public.businesses b
  JOIN public.business_members bm ON bm.business_id = b.id
  WHERE bm.user_id = user_profile_id AND bm.role = 'owner'
  ORDER BY b.created_at
  LIMIT 1;

  -- If no business exists, create one atomically with membership
  IF NOT FOUND THEN
    -- Insert business
    INSERT INTO public.businesses (name, owner_id)
    VALUES ('My Business', user_profile_id)
    RETURNING * INTO b;
    
    -- Insert owner membership
    INSERT INTO public.business_members (
      business_id, 
      user_id, 
      role, 
      joined_at
    ) VALUES (
      b.id, 
      user_profile_id, 
      'owner',
      now()
    ) ON CONFLICT (user_id) WHERE role = 'owner' DO NOTHING;
    
    -- Update profile default_business_id if not set
    UPDATE public.profiles 
    SET default_business_id = b.id 
    WHERE id = user_profile_id AND default_business_id IS NULL;
  END IF;

  RETURN b;
END;
$$;

-- Update next_est_number function to use profiles
CREATE OR REPLACE FUNCTION public.next_est_number(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix text;
  v_seq integer;
  v_number text;
  v_user_profile_id uuid;
BEGIN
  -- Get current user's profile ID
  SELECT id INTO v_user_profile_id 
  FROM public.profiles 
  WHERE clerk_user_id = public.current_clerk_user_id();

  UPDATE public.businesses b
  SET est_seq = b.est_seq + 1
  WHERE b.id = p_business_id AND b.owner_id = v_user_profile_id
  RETURNING b.est_prefix, b.est_seq INTO v_prefix, v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Business not found or not owned by current user';
  END IF;

  v_number := v_prefix || lpad(v_seq::text, 3, '0');
  RETURN v_number;
END;
$$;

-- Update next_inv_number function to use profiles
CREATE OR REPLACE FUNCTION public.next_inv_number(p_business_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prefix text;
  v_seq integer;
  v_number text;
  v_user_profile_id uuid;
BEGIN
  -- Get current user's profile ID
  SELECT id INTO v_user_profile_id 
  FROM public.profiles 
  WHERE clerk_user_id = public.current_clerk_user_id();

  UPDATE public.businesses b
  SET inv_seq = b.inv_seq + 1
  WHERE b.id = p_business_id AND b.owner_id = v_user_profile_id
  RETURNING b.inv_prefix, b.inv_seq INTO v_prefix, v_seq;

  IF v_seq IS NULL THEN
    RAISE EXCEPTION 'Business not found or not owned by current user';
  END IF;

  v_number := v_prefix || lpad(v_seq::text, 3, '0');
  RETURN v_number;
END;
$$;

-- Update ensure_default_business_membership function to use profiles
CREATE OR REPLACE FUNCTION public.ensure_default_business_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- If setting a default_business_id, ensure user has membership in that business
  IF NEW.default_business_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.business_members 
      WHERE user_id = NEW.id AND business_id = NEW.default_business_id
    ) THEN
      RAISE EXCEPTION 'Cannot set default_business_id to a business where user has no membership';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Phase 3: Update RLS Policies to Use Profiles System
-- First, get current user profile ID helper function
CREATE OR REPLACE FUNCTION public.current_user_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT id FROM public.profiles 
  WHERE clerk_user_id = public.current_clerk_user_id()
  LIMIT 1;
$$;

-- Update profiles table policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (current_clerk_user_id() = clerk_user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (current_clerk_user_id() = clerk_user_id)
WITH CHECK (current_clerk_user_id() = clerk_user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (current_user_profile_id() = id);

-- Update business_members table policies
DROP POLICY IF EXISTS "Business members can view their own memberships" ON public.business_members;

CREATE POLICY "Business members can view their own memberships" 
ON public.business_members 
FOR SELECT 
USING (user_id = current_user_profile_id());

-- Update businesses table policies - these should already be correct since they use the helper functions

-- Update timesheet_entries table policies
DROP POLICY IF EXISTS "Business members can insert their own timesheet entries" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Business members can read their own timesheet entries" ON public.timesheet_entries;
DROP POLICY IF EXISTS "Business members can update their own timesheet entries" ON public.timesheet_entries;

CREATE POLICY "Business members can insert their own timesheet entries" 
ON public.timesheet_entries 
FOR INSERT 
WITH CHECK ((user_id = current_user_profile_id()) AND is_business_member(business_id));

CREATE POLICY "Business members can read their own timesheet entries" 
ON public.timesheet_entries 
FOR SELECT 
USING ((user_id = current_user_profile_id()) AND is_business_member(business_id));

CREATE POLICY "Business members can update their own timesheet entries" 
ON public.timesheet_entries 
FOR UPDATE 
USING ((user_id = current_user_profile_id()) AND is_business_member(business_id));

-- Update mail_sends table policies
DROP POLICY IF EXISTS "Mail sends are viewable by owner" ON public.mail_sends;
DROP POLICY IF EXISTS "Owner can delete their own mail sends" ON public.mail_sends;
DROP POLICY IF EXISTS "Owner can insert their own mail sends" ON public.mail_sends;
DROP POLICY IF EXISTS "Owner can update their own mail sends" ON public.mail_sends;

CREATE POLICY "Mail sends are viewable by owner" 
ON public.mail_sends 
FOR SELECT 
USING (current_user_profile_id() = user_id);

CREATE POLICY "Owner can delete their own mail sends" 
ON public.mail_sends 
FOR DELETE 
USING (current_user_profile_id() = user_id);

CREATE POLICY "Owner can insert their own mail sends" 
ON public.mail_sends 
FOR INSERT 
WITH CHECK (current_user_profile_id() = user_id);

CREATE POLICY "Owner can update their own mail sends" 
ON public.mail_sends 
FOR UPDATE 
USING (current_user_profile_id() = user_id);

-- Update subscribers table policies
DROP POLICY IF EXISTS "select_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "insert_own_subscription" ON public.subscribers;

CREATE POLICY "select_own_subscription" 
ON public.subscribers 
FOR SELECT 
USING ((current_user_profile_id() = user_id) OR (auth.email() = email));

CREATE POLICY "update_own_subscription" 
ON public.subscribers 
FOR UPDATE 
USING ((current_user_profile_id() = user_id) OR (auth.email() = email));

CREATE POLICY "insert_own_subscription" 
ON public.subscribers 
FOR INSERT 
WITH CHECK ((current_user_profile_id() = user_id) OR (auth.email() = email));

-- Update quote_events table policy
DROP POLICY IF EXISTS "Owner can read their quote events" ON public.quote_events;

CREATE POLICY "Owner can read their quote events" 
ON public.quote_events 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM quotes q
  WHERE ((q.id)::text = quote_events.quote_id) AND (q.owner_id = current_user_profile_id())
));

-- Update trigger_business_audit function to use profiles
CREATE OR REPLACE FUNCTION public.trigger_business_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log business creation/updates
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_action(
      NEW.id, -- business_id
      NEW.owner_id, -- user_id (now refers to profiles.id)
      'create', -- action
      'business', -- resource_type
      NEW.id::text, -- resource_id
      to_jsonb(NEW) -- details
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_action(
      NEW.id, -- business_id
      NEW.owner_id, -- user_id (now refers to profiles.id)
      'update', -- action
      'business', -- resource_type
      NEW.id::text, -- resource_id
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)) -- details
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;