-- RagDay27 registration table contract
-- Registration numbers are database-owned and allocated from the private
-- registration_counters high-water mark; the frontend/localStorage never allocates numbers.

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

-- Registration-number allocation semantics:
--   * private.registration_counters stores one high-water mark per gender.
--   * private.allocate_registration_number() increments that counter atomically.
--   * male numbers use RDB27-####; female numbers use RDG27-####.
--   * a counter starting at 0 produces 0001 for that gender.
--   * hidden/deleted rows and gaps never cause an allocated number to be reused.
--   * clearing public.registrations does NOT reset the counters; the next
--     registration continues from the last number ever allocated.
--   * rejected re-submission updates the existing row and retains registration_no.
-- The public next_registration_number() helper is not used by the client
-- allocation path; the private allocator is the source of truth.
