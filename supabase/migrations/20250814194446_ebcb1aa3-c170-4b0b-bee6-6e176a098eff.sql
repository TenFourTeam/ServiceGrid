-- Execute complete user removal for Google user
-- Delete the problematic profile that has null default_business_id
DELETE FROM public.profiles 
WHERE clerk_user_id = 'user_31FdcIXRRxIyq5MrD98UYnk0uPt';

-- Clean up any orphaned business_members records for this user
-- (in case there are any leftover from previous attempts)
DELETE FROM public.business_members 
WHERE user_id = '85a00948-206a-45d0-a973-431afcfd9bf6';