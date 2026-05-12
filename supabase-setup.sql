create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  page_id text,
  topic text not null,
  content text not null,
  image_prompt text default '',
  image_url text default '',
  image_provider text,             -- AI model provider (openai, xai, mock)
  image_revised_prompt text,      -- AI revised prompt (if any)
  image_storage_path text,        -- Supabase Storage path
  image_storage_mode text,        -- storage mode (supabase, external)
  status text not null default 'draft',
  scheduled_at timestamptz,
  posted_at timestamptz,
  created_at timestamptz not null default now()
);

-- Migration-safe column additions for existing tables
alter table public.posts add column if not exists image_provider text;
alter table public.posts add column if not exists image_revised_prompt text;
alter table public.posts add column if not exists image_storage_path text;
alter table public.posts add column if not exists image_storage_mode text;

create table if not exists public.app_settings (
  id text primary key default 'default',
  workspace_name text not null default 'AutoPost Studio',
  business_name text not null default '',
  brand_voice text not null default '',
  default_topic_hint text not null default '',
  openai_api_key text not null default '',
  gemini_api_key text not null default '',
  facebook_app_id text not null default '',
  facebook_app_secret text not null default '',
  facebook_page_id text not null default '',
  facebook_page_access_token text not null default '',
  facebook_publish_mode text not null default 'mock',
  scheduler_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_settings add column if not exists gemini_api_key text not null default '';
alter table public.app_settings add column if not exists facebook_publish_mode text not null default 'mock';
alter table public.app_settings add column if not exists scheduler_enabled boolean not null default false;

create table if not exists public.pages (
  id text primary key,
  label text not null,
  description text not null default '',
  facebook_page_id text not null default '',
  facebook_page_access_token text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operation_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  level text not null default 'info',
  source text not null default 'system',
  event text not null default 'unknown',
  message text not null default '',
  page_id text,
  post_id text,
  metadata jsonb not null default '{}'::jsonb
);

alter table public.posts enable row level security;
alter table public.app_settings enable row level security;
alter table public.pages enable row level security;
alter table public.operation_logs enable row level security;

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
drop policy if exists "anon can read pages" on public.pages;
drop policy if exists "anon can insert pages" on public.pages;
drop policy if exists "anon can update pages" on public.pages;
drop policy if exists "anon can delete pages" on public.pages;
drop policy if exists "anon can read operation logs" on public.operation_logs;
drop policy if exists "anon can insert operation logs" on public.operation_logs;
drop policy if exists "anon can update operation logs" on public.operation_logs;
drop policy if exists "anon can delete operation logs" on public.operation_logs;

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

create policy "anon can read pages"
on public.pages
for select
to anon
using (true);

create policy "anon can insert pages"
on public.pages
for insert
to anon
with check (true);

create policy "anon can update pages"
on public.pages
for update
to anon
using (true)
with check (true);

create policy "anon can delete pages"
on public.pages
for delete
to anon
using (true);

create policy "anon can read operation logs"
on public.operation_logs
for select
to anon
using (true);

create policy "anon can insert operation logs"
on public.operation_logs
for insert
to anon
with check (true);

insert into public.pages (id, label, description)
values
  ('default', 'Default Page', 'Current stable Facebook settings'),
  ('demo-mock', 'Demo / Mock Page', 'Simulation for workspace testing')
on conflict (id) do nothing;
