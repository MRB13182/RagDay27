-- RagDay27 registration table contract
-- Registration number allocation is database-owned and derived from current rows.
-- No registration-number sequence/counter table and no frontend/localStorage counter.

create extension if not exists pgcrypto;

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

do $$
begin
  alter publication supabase_realtime add table public.registrations;
exception when duplicate_object then null;
end $$;

-- Required create_registration allocator semantics:
-- For a new row and gender = male:
--   v_next := coalesce((
--     select max((substring(registration_no from '^RDB27-([0-9]+)$'))::bigint)
--     from public.registrations
--     where gender = 'male'
--       and registration_no ~ '^RDB27-[0-9]+$'
--   ), 0) + 1;
--   registration_no := 'RDB27-' || lpad(v_next::text, 4, '0');
--
-- For female use RDG27- and gender = female.
--
-- Therefore:
--   * empty gender set -> 0001
--   * deleting only the highest current number -> that number is reusable
--   * deleting a middle number while a higher number exists -> gap is never reused
--   * emptying the whole registrations table -> both genders restart at 0001
--
-- This is intentionally NOT a historical high-water-mark allocator.
-- Never use localStorage, frontend counters, PostgreSQL registration-number
-- sequences, or a separate counter table for registration_no.
--
-- Rejected re-submission must update the existing row and retain registration_no.
