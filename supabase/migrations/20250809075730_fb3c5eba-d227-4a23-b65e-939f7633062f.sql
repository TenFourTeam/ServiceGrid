-- Secure function search_path and add missing RLS policy
alter function public.set_updated_at() set search_path = public;

create policy if not exists "Owner can delete their own mail sends"
  on public.mail_sends for delete
  using (auth.uid() = user_id);