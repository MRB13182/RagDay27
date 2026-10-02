-- RagDay27 canonical registrations database contract
-- Supabase project ref: xulkacnjqjnluhmbqbcu
-- This file mirrors the production repair architecture.
-- It intentionally contains no site_content or super_admin workflow.

create extension if not exists pgcrypto;

-- Registration numbers are allocated exclusively by the database counter table.
-- The counters remember the highest EVER issued number independently by gender.
create table if not exists public.registration_number_counters (
  gender text primary key check (gender in ('male','female')),
  last_issued bigint not null default 0 check (last_issued >= 0),
  updated_at timestamptz not null default now()
);

insert into public.registration_number_counters (gender,last_issued)
values ('male',0),('female',0)
on conflict (gender) do nothing;

create table if not exists public.registrations (
  id uuid primary key default gen_random_uuid(),
  sl_no bigint generated always as identity unique,
  registration_no text not null unique,
  full_name text not null,
  class_roll text not null,
  student_id text not null,
  contact_mobile_number text not null,
  academic_group text not null,
  academic_section text not null,
  student_photo text,
  send_method text not null check (lower(send_method) in ('bkash','nagad')),
  sender_mobile_no text not null,
  payment_time text not null,
  transaction_id text,
  jersey_back_name varchar(14) not null,
  jersey_number varchar(2) not null check (jersey_number ~ '^[0-9]{2}$'),
  jersey_size text not null check (jersey_size in ('S','M','L','XL','2XL','3XL','4XL')),
  gender text not null check (gender in ('male','female')),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reject_reason text,
  approved_by uuid references public.admins(id),
  rejected_by uuid references public.admins(id),
  approved_at timestamptz,
  rejected_at timestamptz,
  hidden_from_web boolean not null default false,
  hidden_by uuid references public.admins(id),
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_registrations_registration_no on public.registrations(registration_no);
create index if not exists idx_registrations_student_id on public.registrations(student_id);
create index if not exists idx_registrations_class_roll on public.registrations(class_roll);
create index if not exists idx_registrations_gender_status on public.registrations(gender,status);
create index if not exists idx_registrations_approved_by on public.registrations(approved_by);
create index if not exists idx_registrations_rejected_by on public.registrations(rejected_by);
create index if not exists idx_registrations_hidden_by on public.registrations(hidden_by);
create index if not exists idx_registrations_hidden_gender_status on public.registrations(hidden_from_web,gender,status);

alter table public.registrations enable row level security;

-- Production policies are maintained by the dedicated repair migration.
-- Do not reintroduce broad anonymous SELECT/UPDATE/DELETE policies here.

-- Realtime
do $$
begin
  alter publication supabase_realtime add table public.registrations;
exception when duplicate_object then null;
end $$;


-- Production allocator contract (deployed through ordered Supabase migrations):
-- public.next_registration_number(p_gender text)
-- returns RDB27-<n> for male and RDG27-<n> for female using
-- public.registration_number_counters.last_issued. Never use MAX(registration_no),
-- frontend counters, or localStorage for allocation.
