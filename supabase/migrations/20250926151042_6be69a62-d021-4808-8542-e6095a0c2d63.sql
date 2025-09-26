-- ============================================
-- COMPREHENSIVE ARCHITECTURE REFACTORING
-- Make business_members table worker-only
-- ============================================

-- Step 1: Remove all owner memberships from business_members
-- These should only exist in businesses.owner_id now
DELETE FROM public.business_members WHERE role = 'owner';

-- Step 2: Add constraint to ensure business_members contains only workers
ALTER TABLE public.business_members 
ADD CONSTRAINT business_members_role_check CHECK (role = 'worker');

-- Step 3: Update is_business_member function to check both ownership and membership
CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Check if user is the owner OR a worker member
  SELECT COALESCE(
    -- Check ownership first
    EXISTS(
      SELECT 1 FROM public.businesses b
      JOIN public.profiles p ON p.id = b.owner_id
      WHERE b.id = p_business_id 
      AND p.clerk_user_id = public.current_clerk_user_id()
    ) OR
    -- Check worker membership
    EXISTS(
      SELECT 1 FROM public.business_members bm
      JOIN public.profiles p ON p.id = bm.user_id
      WHERE bm.business_id = p_business_id
      AND p.clerk_user_id = public.current_clerk_user_id()
    ),
    false
  );
$$;

-- Step 4: Update can_manage_business to only check ownership
CREATE OR REPLACE FUNCTION public.can_manage_business(p_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Only owners can manage business (no more owner memberships in business_members)
  SELECT COALESCE(
    EXISTS(
      SELECT 1 FROM public.businesses b
      JOIN public.profiles p ON p.id = b.owner_id
      WHERE b.id = p_business_id 
      AND p.clerk_user_id = public.current_clerk_user_id()
    ),
    false
  );
$$;

-- Step 5: Update user_business_role function for new architecture
CREATE OR REPLACE FUNCTION public.user_business_role(p_business_id uuid, p_user_id uuid)
RETURNS business_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    -- Check if user is the owner
    WHEN EXISTS(
      SELECT 1 FROM public.businesses b
      WHERE b.id = p_business_id AND b.owner_id = p_user_id
    ) THEN 'owner'::business_role
    -- Check if user is a worker member
    WHEN EXISTS(
      SELECT 1 FROM public.business_members bm
      WHERE bm.business_id = p_business_id AND bm.user_id = p_user_id
    ) THEN 'worker'::business_role
    -- Default fallback
    ELSE 'worker'::business_role
  END;
$$;