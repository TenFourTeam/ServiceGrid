create policy "Owner can delete their own mail sends"
  on public.mail_sends for delete
  using (auth.uid() = user_id);