-- Add unique constraint to prevent multiple owner memberships per user
CREATE UNIQUE INDEX IF NOT EXISTS ux_owner_one_business_per_user
  ON public.business_members(user_id)
  WHERE role = 'owner';