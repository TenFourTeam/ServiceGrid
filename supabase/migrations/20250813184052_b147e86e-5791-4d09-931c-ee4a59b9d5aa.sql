-- Create business role enum with owner and worker
CREATE TYPE business_role AS ENUM ('owner', 'worker');

-- Create business_members table for multi-user businesses
CREATE TABLE business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role business_role NOT NULL DEFAULT 'worker',
  invited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  joined_at TIMESTAMPTZ,
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- Enable RLS on business_members
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for business_members
CREATE POLICY "Business members can view their own memberships"
ON business_members FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Business owners can view all members"
ON business_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM business_members bm
    WHERE bm.business_id = business_members.business_id
    AND bm.user_id = auth.uid()
    AND bm.role = 'owner'
  )
);

CREATE POLICY "Business owners can manage members"
ON business_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM business_members bm
    WHERE bm.business_id = business_members.business_id
    AND bm.user_id = auth.uid()
    AND bm.role = 'owner'
  )
);

-- Create security functions to check business roles
CREATE OR REPLACE FUNCTION public.user_business_role(p_business_id UUID)
RETURNS business_role
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM business_members 
  WHERE business_id = p_business_id AND user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.can_manage_business(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM business_members 
     WHERE business_id = p_business_id AND user_id = auth.uid()) = 'owner',
    false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM business_members 
    WHERE business_id = p_business_id AND user_id = auth.uid()
  );
$$;

-- Populate business_members with existing business owners
INSERT INTO business_members (business_id, user_id, role, joined_at)
SELECT id, owner_id, 'owner', created_at
FROM businesses
WHERE owner_id IS NOT NULL
ON CONFLICT (business_id, user_id) DO NOTHING;

-- Add trigger for updated_at
CREATE TRIGGER update_business_members_updated_at
BEFORE UPDATE ON business_members
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();