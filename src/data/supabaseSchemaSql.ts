export const SUPABASE_SQL_SCHEMA = `-- ============================================================================
-- RAG DAY 27 (RD27) - COMPLETE CANONICAL SUPABASE DATABASE SCHEMA
-- ============================================================================
-- How to apply this schema:
-- 1. Open your Supabase Project Dashboard (https://supabase.com/dashboard)
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New query", paste the entire contents of this file, and click "Run"
-- ============================================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- 1. REGISTRATION NUMBER SEQUENCE
-- ============================================================================
create sequence if not exists public.registration_no_seq start with 101 increment by 1;

-- ============================================================================
-- 2. REGISTRATIONS TABLE
-- ============================================================================
create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  registration_no bigint not null default nextval('public.registration_no_seq') unique,
  student_name text not null,
  gender text not null check (gender in ('male', 'female')),
  roll text not null,
  student_id text not null,
  group_name text not null,
  section_name text not null,
  jersey_name text not null,
  jersey_number text not null,
  jersey_size text not null check (jersey_size in ('S','M','L','XL','2XL','3XL','4XL')),
  sender_number text not null,
  payment_method text not null check (payment_method in ('bkash','nagad')),
  payment_time text default '12:00:00',
  transaction_id text,
  registration_fee numeric(12,2) not null default 500,
  student_photo text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  approved_by text,
  approved_at timestamptz,
  rejected_by text,
  rejected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Registrations indexes for fast search and admin filter
create index if not exists idx_registrations_reg_no on public.registrations(registration_no);
create index if not exists idx_registrations_roll on public.registrations(roll);
create index if not exists idx_registrations_student_id on public.registrations(student_id);
create index if not exists idx_registrations_status on public.registrations(status);
create index if not exists idx_registrations_gender on public.registrations(gender);

-- ============================================================================
-- 3. SITE CONTENT TABLE (Website, Event, PDF, Branding, Sections, & Settings)
-- ============================================================================
create table if not exists public.site_content (
  id text primary key default 'current',
  website_name text default 'Rag Day 27',
  event_name text default 'Rag Day 27 (RD27)',
  hero_title text default 'Official Rag Day 27 Celebration',
  hero_subtitle text default 'Celebrate our journey together with the official batch 27 grand gathering.',
  event_date date default '2027-11-27',
  event_time text default '10:00:00',
  registration_fee numeric(12,2) default 500,
  venue text default 'Central Amphitheatre',
  logo text,
  favicon text,
  banner text,
  hero_background text,
  male_front text,
  male_back text,
  female_front text,
  female_back text,
  jersey_preview text,
  cards_json jsonb not null default '[]'::jsonb,
  sections_json jsonb not null default '[]'::jsonb,
  content_blocks_json jsonb not null default '{}'::jsonb,
  visible boolean not null default true,
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade existing site_content table if it was created previously with fewer columns
alter table public.site_content add column if not exists website_name text default 'Rag Day 27';
alter table public.site_content add column if not exists hero_title text default 'Official Rag Day 27 Celebration';
alter table public.site_content add column if not exists hero_subtitle text default 'Celebrate our journey together with the official batch 27 grand gathering.';
alter table public.site_content add column if not exists event_time text default '10:00:00';
alter table public.site_content add column if not exists venue text default 'Central Amphitheatre';
alter table public.site_content add column if not exists banner text;
alter table public.site_content add column if not exists hero_banner text;
alter table public.site_content add column if not exists hero_background text;
alter table public.site_content add column if not exists male_front text;
alter table public.site_content add column if not exists male_back text;
alter table public.site_content add column if not exists female_front text;
alter table public.site_content add column if not exists female_back text;
alter table public.site_content add column if not exists jersey_preview text;
alter table public.site_content add column if not exists jersey_front_design text;
alter table public.site_content add column if not exists jersey_back_design text;
alter table public.site_content add column if not exists cards_json jsonb not null default '[]'::jsonb;
alter table public.site_content add column if not exists sections_json jsonb not null default '[]'::jsonb;
alter table public.site_content add column if not exists content_blocks_json jsonb not null default '{}'::jsonb;
alter table public.site_content add column if not exists visible boolean not null default true;
alter table public.site_content add column if not exists sort_order integer not null default 1;

-- Seed canonical default row 'current'
insert into public.site_content (
  id,
  website_name,
  event_name,
  hero_title,
  hero_subtitle,
  event_date,
  event_time,
  venue,
  registration_fee,
  visible,
  sort_order
)
values (
  'current',
  'Rag Day 27',
  'Rag Day 27 (RD27)',
  'Official Rag Day 27 Celebration',
  'Celebrate our journey together with the official batch 27 grand gathering.',
  '2027-11-27',
  '10:00:00',
  'Central Amphitheatre',
  500,
  true,
  1
)
on conflict (id) do nothing;

-- ============================================================================
-- 4. ADMINS TABLE & PASSCODES
-- ============================================================================
create table if not exists public.admins (
  id text primary key default gen_random_uuid()::text,
  auth_user_id text not null unique,
  username text,
  full_name text not null,
  role text not null check (role in ('super_admin','male_admin','female_admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Seed canonical administrator passcodes
insert into public.admins (auth_user_id, username, full_name, role, active)
values
  ('rdnic27.com', 'superadmin', 'Super Administrator', 'super_admin', true),
  ('rdnicboy.27', 'maleadmin', 'Male Administrator (Boys)', 'male_admin', true),
  ('rdnic.girl27', 'femaleadmin', 'Female Administrator (Girls)', 'female_admin', true)
on conflict (auth_user_id) do update set
  role = excluded.role,
  full_name = excluded.full_name,
  active = true;

-- ============================================================================
-- 5. PERMISSIONS & SCHEMA PRIVILEGES
-- ============================================================================
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all routines in schema public to anon, authenticated;

alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
alter table public.registrations enable row level security;
alter table public.site_content enable row level security;
alter table public.admins enable row level security;

-- Registrations policies
drop policy if exists "Allow public insert into registrations" on public.registrations;
create policy "Allow public insert into registrations" on public.registrations
  for insert with check (true);

drop policy if exists "Allow public select from registrations" on public.registrations;
create policy "Allow public select from registrations" on public.registrations
  for select using (true);

drop policy if exists "Allow public update on registrations" on public.registrations;
create policy "Allow public update on registrations" on public.registrations
  for update using (true);

drop policy if exists "Allow public delete on registrations" on public.registrations;
create policy "Allow public delete on registrations" on public.registrations
  for delete using (true);

-- Site Content policies
drop policy if exists "Allow public read site_content" on public.site_content;
create policy "Allow public read site_content" on public.site_content
  for select using (true);

drop policy if exists "Allow public manage site_content" on public.site_content;
create policy "Allow public manage site_content" on public.site_content
  for all using (true) with check (true);

-- Admins policies
drop policy if exists "Allow public read admins" on public.admins;
create policy "Allow public read admins" on public.admins
  for select using (true);

drop policy if exists "Allow public manage admins" on public.admins;
create policy "Allow public manage admins" on public.admins
  for all using (true) with check (true);

-- ============================================================================
-- 7. STORAGE BUCKET 'uploads' (Photos, Logos, Banners, Favicons, Jerseys)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do update set public = true;

-- Storage object policies
drop policy if exists "Allow public access on uploads bucket" on storage.objects;
create policy "Allow public access on uploads bucket" on storage.objects
  for select using (bucket_id = 'uploads');

drop policy if exists "Allow public uploads on uploads bucket" on storage.objects;
create policy "Allow public uploads on uploads bucket" on storage.objects
  for insert with check (bucket_id = 'uploads');

drop policy if exists "Allow public updates on uploads bucket" on storage.objects;
create policy "Allow public updates on uploads bucket" on storage.objects
  for update using (bucket_id = 'uploads');

drop policy if exists "Allow public deletes on uploads bucket" on storage.objects;
create policy "Allow public deletes on uploads bucket" on storage.objects
  for delete using (bucket_id = 'uploads');

-- ============================================================================
-- 8. REAL-TIME SUBSCRIPTION PUBLICATION
-- ============================================================================
do $$
begin
  alter publication supabase_realtime add table public.registrations;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.site_content;
exception when others then null;
end $$;
`;
