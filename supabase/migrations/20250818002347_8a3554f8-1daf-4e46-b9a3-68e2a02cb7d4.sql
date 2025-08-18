-- Fix foreign key relationship for invites.invited_by
ALTER TABLE public.invites 
ADD CONSTRAINT invites_invited_by_fkey 
FOREIGN KEY (invited_by) REFERENCES public.profiles(id);