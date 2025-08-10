-- Create public bucket for business logos
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

-- Recreate policies for a clean state
drop policy if exists "Public can view business-logos" on storage.objects;
drop policy if exists "Users can upload their own logos" on storage.objects;
drop policy if exists "Users can update their own logos" on storage.objects;
drop policy if exists "Users can delete their own logos" on storage.objects;

-- Public read access to files in this bucket
create policy "Public can view business-logos"
  on storage.objects for select
  using (bucket_id = 'business-logos');

-- Allow authenticated users to upload to a folder matching their user id
create policy "Users can upload their own logos"
  on storage.objects for insert
  with check (
    bucket_id = 'business-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to update files in their own folder
create policy "Users can update their own logos"
  on storage.objects for update
  using (
    bucket_id = 'business-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow authenticated users to delete files in their own folder
create policy "Users can delete their own logos"
  on storage.objects for delete
  using (
    bucket_id = 'business-logos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );