# Supabase Apply Required

Production/backend storage is not fully aligned yet from this workspace.

Current verified status:

* `.env` contains only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
* `supabase` CLI is not installed here
* direct live probe still returns:
  * `Bucket not found` for `generated-images`
  * `new row violates row-level security policy` for upload

Because this machine does not have Supabase admin/CLI access, the storage setup was **not** applied to the real project from here.

## Apply In Supabase SQL Editor

Run this exact SQL in the connected Supabase project:

```sql
insert into storage.buckets (id, name, public)
values ('generated-images', 'generated-images', true)
on conflict (id) do update
set name = excluded.name,
    public = excluded.public;

drop policy if exists "anon can read generated images" on storage.objects;
drop policy if exists "anon can upload generated images" on storage.objects;
drop policy if exists "anon can update generated images" on storage.objects;

create policy "anon can read generated images"
on storage.objects
for select
to anon
using (bucket_id = 'generated-images');

create policy "anon can upload generated images"
on storage.objects
for insert
to anon
with check (bucket_id = 'generated-images');

create policy "anon can update generated images"
on storage.objects
for update
to anon
using (bucket_id = 'generated-images')
with check (bucket_id = 'generated-images');
```

## Verification Checklist

1. Confirm bucket `generated-images` exists in Storage and is public.
2. Run `node verify-storage-upload.mjs`.
3. Confirm:
   * `bucketStatus.ok` is `true`
   * `uploadStatus.ok` is `true`
   * `publicUrlKind` is `https`
   * no `Bucket not found`
   * no `row-level security policy` error
4. In the app, upload a jpg/png/webp image and confirm:
   * preview still works
   * no fallback warning appears
   * saved draft stores a public Supabase URL
   * no `blob:` / `file:` / `localhost:` URL is persisted
