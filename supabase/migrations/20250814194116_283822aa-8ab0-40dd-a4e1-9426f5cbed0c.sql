-- Clean up broken Google user profile data
-- Delete the problematic profile that has null default_business_id
DELETE FROM public.profiles 
WHERE clerk_user_id = 'user_31FdcIXRRxIyq5MrD98UYnk0uPt';

-- Clean up any orphaned business_members records for this user
-- (in case there are any leftover from previous attempts)
DELETE FROM public.business_members 
WHERE user_id = (
  SELECT id FROM public.profiles 
  WHERE clerk_user_id = 'user_31FdcIXRRxIyq5MrD98UYnk0uPt'
);