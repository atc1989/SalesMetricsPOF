-- Storage bucket for bill attachments + RLS policies.
-- Matches src/services/billAttachments.service.ts which uses bucket name 'bill_attachments'.

insert into storage.buckets (id, name, public)
values ('bill_attachments', 'bill_attachments', false)
on conflict (id) do nothing;

-- Authenticated users can read objects in the bill_attachments bucket.
drop policy if exists "Authenticated read bill_attachments" on storage.objects;
create policy "Authenticated read bill_attachments"
on storage.objects for select
to authenticated
using (bucket_id = 'bill_attachments');

-- Authenticated users can upload to the bill_attachments bucket.
drop policy if exists "Authenticated insert bill_attachments" on storage.objects;
create policy "Authenticated insert bill_attachments"
on storage.objects for insert
to authenticated
with check (bucket_id = 'bill_attachments');

-- Authenticated users can delete their own objects (relaxed: any authenticated).
drop policy if exists "Authenticated delete bill_attachments" on storage.objects;
create policy "Authenticated delete bill_attachments"
on storage.objects for delete
to authenticated
using (bucket_id = 'bill_attachments');

drop policy if exists "Authenticated update bill_attachments" on storage.objects;
create policy "Authenticated update bill_attachments"
on storage.objects for update
to authenticated
using (bucket_id = 'bill_attachments')
with check (bucket_id = 'bill_attachments');
