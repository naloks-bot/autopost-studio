create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  page_id text,
  topic text not null,
  content text not null,
  image_prompt text default '',
  image_url text default '',
  status text not null default 'draft',
  scheduled_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.app_settings (
  id text primary key default 'default',
  workspace_name text not null default 'AutoPost Studio',
  business_name text not null default '',
  brand_voice text not null default '',
  default_topic_hint text not null default '',
  openai_api_key text not null default '',
  xai_api_key text not null default '',
  facebook_app_id text not null default '',
  facebook_app_secret text not null default '',
  facebook_page_id text not null default '',
  facebook_page_access_token text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.posts enable row level security;
alter table public.app_settings enable row level security;

drop policy if exists "anon can read posts" on public.posts;
drop policy if exists "anon can insert posts" on public.posts;
drop policy if exists "anon can update posts" on public.posts;
drop policy if exists "anon can delete posts" on public.posts;

create policy "anon can read posts"
on public.posts
for select
to anon
using (true);

create policy "anon can insert posts"
on public.posts
for insert
to anon
with check (true);

create policy "anon can update posts"
on public.posts
for update
to anon
using (true)
with check (true);

create policy "anon can delete posts"
on public.posts
for delete
to anon
using (true);

drop policy if exists "anon can read app settings" on public.app_settings;
drop policy if exists "anon can upsert app settings" on public.app_settings;
drop policy if exists "anon can delete app settings" on public.app_settings;

create policy "anon can read app settings"
on public.app_settings
for select
to anon
using (true);

create policy "anon can insert app settings"
on public.app_settings
for insert
to anon
with check (id = 'default');

create policy "anon can update app settings"
on public.app_settings
for update
to anon
using (id = 'default')
with check (id = 'default');

create policy "anon can delete app settings"
on public.app_settings
for delete
to anon
using (id = 'default');
