-- RAG DAY 27 - authoritative production Supabase schema
-- Live project: rqjlrbteaqjpgwkeomro
-- Full function/policy implementation is tracked in the live Supabase migrations.

create extension if not exists pgcrypto with schema extensions;

do $$ begin create type public.admin_role as enum ('super_admin','male_admin','female_admin'); exception when duplicate_object then null; end $$;
do $$ begin create type public.registration_status as enum ('pending','approved','rejected'); exception when duplicate_object then null; end $$;
do $$ begin create type public.gender_type as enum ('male','female'); exception when duplicate_object then null; end $$;

create sequence if not exists public.registration_no_seq start 1 increment 1 minvalue 1 no cycle;

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null, username text unique, role public.admin_role not null,
  active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(), name text not null unique,
  active boolean not null default true, sort_order integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  gender public.gender_type not null, code text not null, display_name text not null,
  active boolean not null default true, sort_order integer not null default 1,
  unique(group_id, gender, code)
);

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  registration_no bigint not null unique default nextval('public.registration_no_seq'),
  student_name text not null, gender public.gender_type not null, roll text, student_id text,
  group_id uuid not null references public.groups(id), section_id uuid not null references public.sections(id),
  jersey_name text, jersey_number text, jersey_size text, contact_number text,
  sender_number text not null, payment_method text not null check(payment_method in ('bkash','nagad')),
  payment_time timestamptz not null, transaction_id text,
  registration_fee numeric(12,2) not null, currency text not null default 'BDT',
  student_photo_path text, status public.registration_status not null default 'pending',
  rejection_reason text, approved_by uuid references auth.users(id), approved_at timestamptz,
  rejected_by uuid references auth.users(id), rejected_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.payment_settings (
  id text primary key default 'current', registration_fee numeric(12,2) not null default 500,
  currency text not null default 'BDT', bkash_number text, nagad_number text,
  bkash_enabled boolean not null default true, nagad_enabled boolean not null default true,
  updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);

create table if not exists public.website_settings (
  id text primary key default 'current', website_name text not null default 'Rag Day 27 (RD27)',
  event_name text not null default 'Rag Day 27 (RD27)', event_date date default '2027-11-27',
  event_time time default '10:00:00', registration_deadline timestamptz, registration_open boolean not null default true,
  registration_fee_display text default '500 BDT', banner_active boolean not null default true, banner_text text,
  hero_title text, hero_subtitle text, venue text, updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.branding_settings (
  id text primary key default 'current', website_name text, logo_path text, favicon_path text,
  banner_path text, hero_background_path text, footer_logo_path text, footer_text text,
  updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);

create table if not exists public.pdf_settings (
  id text primary key default 'current', pdf_title text default 'RAG DAY 27', pdf_subtitle text,
  logo_path text, footer_text text, signature_text text, background_image_path text,
  show_logo boolean not null default true, show_photo boolean not null default true,
  show_registration_no boolean not null default true, show_student_details boolean not null default true,
  updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);

create table if not exists public.event_cards (
  id text primary key, title text not null, description text, icon text,
  sort_order integer not null default 1, visible boolean not null default true, active boolean not null default true,
  updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);

create table if not exists public.site_sections (
  id text primary key, section_key text not null unique, title text,
  visible boolean not null default true, sort_order integer not null default 1,
  updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);

create table if not exists public.jersey_settings (
  id uuid primary key default gen_random_uuid(), gender public.gender_type,
  front_image_path text, back_image_path text, full_jersey_image_path text, official_release_image_path text,
  active boolean not null default true, updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.jersey_showcase (
  id text primary key default 'current', enabled boolean not null default true,
  section_order text not null default 'showcase_first' check(section_order in ('showcase_first','cards_first')),
  jerseys jsonb not null default '[]'::jsonb, updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(), registration_id uuid not null unique references public.registrations(id) on delete cascade,
  invitation_code text not null unique, verification_token text not null unique, pdf_path text,
  generated_at timestamptz, revoked boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(), actor_user_id uuid references auth.users(id),
  actor_role public.admin_role, action text not null, entity_type text, entity_id uuid,
  old_data jsonb, new_data jsonb, metadata jsonb, created_at timestamptz not null default now()
);

create table if not exists public.admin_files (
  id text primary key, category text not null check(category in ('logo','banner','jersey','certificate','resume','invitation','project','skill')),
  title text not null, description text, file_url text not null, file_name text, file_size text, file_type text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), updated_by uuid references auth.users(id)
);

-- The production database uses RLS on every exposed application table.
-- Registration numbers come only from registration_no_seq.
-- Serial numbers are computed at query/display time and are never stored.
