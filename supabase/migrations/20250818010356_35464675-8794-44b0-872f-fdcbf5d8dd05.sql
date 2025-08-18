-- Add joined_via_invite field to business_members table
ALTER TABLE public.business_members 
ADD COLUMN joined_via_invite boolean NOT NULL DEFAULT false;