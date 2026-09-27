-- RagDay27 canonical database reference
-- Production migrations are tracked in Supabase migration history.
-- Application data tables: registrations, admins, site_content.
-- Supabase Auth tables under auth.* remain managed by Supabase.

create table if not exists public.admins (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text not null,
  role text not null check (role in ('super_admin','male_admin','female_admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_content (
  id text primary key default 'current',
  logo text,
  favicon text,
  banner text,
  hero_background text,
  male_front text,
  male_back text,
  female_front text,
  female_back text,
  jersey_preview text,
  website_name text,
  event_name text,
  hero_title text,
  hero_subtitle text,
  event_date date,
  event_time time,
  registration_fee numeric(12,2) default 500,
  venue text,
  cards jsonb not null default '[]'::jsonb,
  sections jsonb not null default '[]'::jsonb,
  content_blocks jsonb not null default '{}'::jsonb,
  visible boolean not null default true,
  sort_order integer not null default 1,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- registrations includes:
-- registration_no, student_name, gender, roll, student_id, group_name,
-- section_name, jersey_name, jersey_number, jersey_size, sender_number,
-- payment_method, payment_time, transaction_id, registration_fee,
-- student_photo, status, rejection_reason, approved_by, approved_at,
-- rejected_by, rejected_at, created_at, updated_at.
-- registration_no is assigned by the database sequence/trigger.
