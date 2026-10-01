-- ============================================================================
-- RAG DAY 27 (RD27) - PRODUCTION DATABASE ARCHITECTURE: FILE 2 of 2
-- FILE: registrations.sql
-- TARGET PROJECT REF: xulkacnjqjnluhmbqbcu
-- SUPABASE URL: https://xulkacnjqjnluhmbqbcu.supabase.co
-- ============================================================================
-- GOAL:
-- Complete, high-performance, strictly isolated student registration schema.
-- Includes:
--   - Strict 1:Many relationships to public.admins
--   - Permanent Registration Number Generator (RDB27-XXXX & RDG27-XXXX)
--   - Full Status Flow (pending -> approved / rejected)
--   - Reject Recovery Search Engine
--   - Invitation Card Lookup API
--   - Web Deletion (hidden_from_web) vs Permanent Deletion
--   - Supabase Row-Level Security (RLS) isolating Male & Female Admin access
-- ============================================================================

-- 1. EXTENSIONS & SEQUENCES
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- Sequential serial counter for all registrations (SL No)
create sequence if not exists public.registration_sl_seq start with 1 increment by 1;

-- Permanent sequence counters for Male (RDB27-XXXX) and Female (RDG27-XXXX)
create sequence if not exists public.male_reg_seq start with 1 increment by 1;
create sequence if not exists public.female_reg_seq start with 1 increment by 1;

-- 2. CREATE REGISTRATIONS TABLE
create table if not exists public.registrations (
  -- Core Identification
  id uuid primary key default gen_random_uuid(),
  sl_no bigint not null default nextval('public.registration_sl_seq') unique,
  photo_url text,
  registration_no text not null unique,

  -- Student Personal Information
  student_name text not null,
  college_id text not null,
  roll text not null,
  "group" text not null check ("group" in ('Science', 'Business Studies', 'Humanities')),
  section text not null,
  gender text not null check (gender in ('male', 'female')),

  -- Squad Jersey Information
  jersey_name text not null,
  jersey_number text not null,
  jersey_size text not null check (jersey_size in ('S', 'M', 'L', 'XL', '2XL', '3XL', '4XL')),

  -- Payment & Verification Information
  payment_method text not null check (payment_method in ('bkash', 'nagad')),
  sender_number text not null,
  payment_time text not null default '12:00:00',
  transaction_id text,

  -- Lifecycle Status & Reason
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reject_reason text,

  -- Approval Audit Metadata (Foreign Key -> admins.id)
  approved_by uuid references public.admins(id) on delete set null,
  approved_at timestamptz,

  -- Rejection Audit Metadata (Foreign Key -> admins.id)
  rejected_by uuid references public.admins(id) on delete set null,
  rejected_at timestamptz,

  -- Soft Web-Deletion Metadata (Foreign Key -> admins.id)
  hidden_from_web boolean not null default false,
  deleted_by uuid references public.admins(id) on delete set null,
  deleted_at timestamptz,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Backward-compatibility columns to gracefully support existing queries without breaking
  student_id text,
  group_name text,
  section_name text,
  student_photo text,
  rejection_reason text,
  registration_fee numeric(12,2) not null default 500
);

-- Comments for database documentation
comment on table public.registrations is 'Official student registrations and approval lifecycle for Rag Day 27';
comment on column public.registrations.sl_no is 'Sequential registration order index';
comment on column public.registrations.registration_no is 'Permanent registration number: RDB27-XXXX (male) or RDG27-XXXX (female)';
comment on column public.registrations.hidden_from_web is 'Soft delete flag: hidden from web view while keeping number reserved';
comment on column public.registrations.approved_by is 'Admin reference who approved the registration';
comment on column public.registrations.rejected_by is 'Admin reference who rejected the registration with reason';
comment on column public.registrations.deleted_by is 'Admin reference who marked record hidden from website';

-- 3. BIDIRECTIONAL COLUMN SYNCHRONIZATION TRIGGER
-- Ensures college_id <-> student_id, "group" <-> group_name, section <-> section_name,
-- photo_url <-> student_photo, and reject_reason <-> rejection_reason remain in sync.
create or replace function public.fn_sync_registration_aliases()
returns trigger as $$
begin
  -- Sync college_id / student_id
  if new.college_id is not null and (new.student_id is null or new.student_id = '') then
    new.student_id := new.college_id;
  elsif new.student_id is not null and (new.college_id is null or new.college_id = '') then
    new.college_id := new.student_id;
  end if;

  -- Sync group / group_name
  if new."group" is not null and (new.group_name is null or new.group_name = '') then
    new.group_name := new."group";
  elsif new.group_name is not null and (new."group" is null or new."group" = '') then
    new."group" := new.group_name;
  end if;

  -- Sync section / section_name
  if new.section is not null and (new.section_name is null or new.section_name = '') then
    new.section_name := new.section;
  elsif new.section_name is not null and (new.section_name = '') then
    new.section := new.section_name;
  end if;

  -- Sync photo_url / student_photo
  if new.photo_url is not null and (new.student_photo is null or new.student_photo = '') then
    new.student_photo := new.photo_url;
  elsif new.student_photo is not null and (new.photo_url is null or new.photo_url = '') then
    new.photo_url := new.student_photo;
  end if;

  -- Sync reject_reason / rejection_reason
  if new.reject_reason is not null and (new.rejection_reason is null or new.rejection_reason = '') then
    new.rejection_reason := new.reject_reason;
  elsif new.rejection_reason is not null and (new.reject_reason is null or new.reject_reason = '') then
    new.reject_reason := new.rejection_reason;
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_sync_registration_aliases
  before insert or update on public.registrations
  for each row
  execute function public.fn_sync_registration_aliases();

-- 4. PERMANENT REGISTRATION NUMBER GENERATOR TRIGGER
-- Format: Male: RDB27-XXXX | Female: RDG27-XXXX
-- Number is generated once on insert.
-- Re-submissions retain the exact existing permanent registration number.
create or replace function public.fn_generate_permanent_reg_no()
returns trigger as $$
declare
  v_seq bigint;
  v_prefix text;
begin
  -- Only generate when registration_no is missing, empty, or placeholder
  if new.registration_no is null or trim(new.registration_no) = '' or new.registration_no ilike 'pending%' then
    if new.gender = 'female' then
      v_seq := nextval('public.female_reg_seq');
      v_prefix := 'RDG27';
    else
      v_seq := nextval('public.male_reg_seq');
      v_prefix := 'RDB27';
    end if;
    new.registration_no := v_prefix || '-' || lpad(v_seq::text, 4, '0');
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_generate_permanent_reg_no
  before insert on public.registrations
  for each row
  execute function public.fn_generate_permanent_reg_no();

-- 5. UPDATED_AT TIMESTAMP TRIGGER
create or replace function public.fn_registrations_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_registrations_updated_at
  before update on public.registrations
  for each row
  execute function public.fn_registrations_set_updated_at();

-- 6. AUDIT ENFORCEMENT & INTEGRITY TRIGGER
-- Enforces:
--   - When status transitions to 'rejected', reject_reason is strictly required.
--   - When status transitions to 'approved', reject_reason is cleared.
create or replace function public.fn_enforce_registration_status_rules()
returns trigger as $$
begin
  if new.status = 'rejected' then
    if new.reject_reason is null or trim(new.reject_reason) = '' then
      raise exception 'Rejection reason is strictly required when setting registration status to rejected.';
    end if;
    new.rejected_at := coalesce(new.rejected_at, now());
    new.approved_at := null;
    new.approved_by := null;
  elsif new.status = 'approved' then
    new.reject_reason := null;
    new.rejection_reason := null;
    new.rejected_at := null;
    new.rejected_by := null;
    new.approved_at := coalesce(new.approved_at, now());
  elsif new.status = 'pending' then
    -- When re-submitting from rejected
    new.reject_reason := null;
    new.rejection_reason := null;
    new.rejected_at := null;
    new.rejected_by := null;
    new.approved_at := null;
    new.approved_by := null;
  end if;

  -- If marked hidden_from_web, record deleted_at
  if new.hidden_from_web = true and (old is null or old.hidden_from_web = false) then
    new.deleted_at := coalesce(new.deleted_at, now());
  end if;

  return new;
end;
$$ language plpgsql;

create trigger trg_enforce_registration_status_rules
  before insert or update on public.registrations
  for each row
  execute function public.fn_enforce_registration_status_rules();

-- 7. PERFORMANCE & SEARCH INDEXES
create index if not exists idx_registrations_registration_no on public.registrations(registration_no);
create index if not exists idx_registrations_sl_no on public.registrations(sl_no);
create index if not exists idx_registrations_gender on public.registrations(gender);
create index if not exists idx_registrations_status on public.registrations(status);
create index if not exists idx_registrations_hidden_from_web on public.registrations(hidden_from_web);
create index if not exists idx_registrations_college_id on public.registrations(college_id);
create index if not exists idx_registrations_roll on public.registrations(roll);
create index if not exists idx_registrations_student_name on public.registrations(student_name);
create index if not exists idx_registrations_gender_status_hidden on public.registrations(gender, status, hidden_from_web);
create index if not exists idx_registrations_approved_by on public.registrations(approved_by);
create index if not exists idx_registrations_rejected_by on public.registrations(rejected_by);
create index if not exists idx_registrations_deleted_by on public.registrations(deleted_by);

-- 8. BUSINESS WORKFLOW STORED PROCEDURES / FUNCTIONS

-- A. APPROVAL FLOW: Admin approves a registration
create or replace function public.approve_registration(
  p_registration_id uuid,
  p_admin_id uuid default null
)
returns public.registrations
language plpgsql
security definer
as $$
declare
  v_reg public.registrations;
  v_admin_id uuid;
begin
  v_admin_id := coalesce(p_admin_id, public.current_admin_id());

  update public.registrations
  set
    status = 'approved',
    approved_by = v_admin_id,
    approved_at = now(),
    reject_reason = null,
    rejected_by = null,
    rejected_at = null,
    updated_at = now()
  where id = p_registration_id
  returning * into v_reg;

  if not found then
    raise exception 'Registration with ID % not found.', p_registration_id;
  end if;

  return v_reg;
end;
$$;

-- B. REJECTION FLOW: Admin rejects a registration with mandatory reason
create or replace function public.reject_registration(
  p_registration_id uuid,
  p_reason text,
  p_admin_id uuid default null
)
returns public.registrations
language plpgsql
security definer
as $$
declare
  v_reg public.registrations;
  v_admin_id uuid;
  v_clean_reason text;
begin
  v_clean_reason := trim(p_reason);
  if v_clean_reason is null or v_clean_reason = '' then
    raise exception 'A rejection reason is strictly required before rejecting.';
  end if;

  v_admin_id := coalesce(p_admin_id, public.current_admin_id());

  update public.registrations
  set
    status = 'rejected',
    reject_reason = v_clean_reason,
    rejected_by = v_admin_id,
    rejected_at = now(),
    approved_by = null,
    approved_at = null,
    updated_at = now()
  where id = p_registration_id
  returning * into v_reg;

  if not found then
    raise exception 'Registration with ID % not found.', p_registration_id;
  end if;

  return v_reg;
end;
$$;

-- C. WEB DELETE FLOW: Admin hides registration from website view
-- The row is NOT deleted from database. Registration number remains permanently reserved.
create or replace function public.hide_registration_from_web(
  p_registration_id uuid,
  p_admin_id uuid default null
)
returns public.registrations
language plpgsql
security definer
as $$
declare
  v_reg public.registrations;
  v_admin_id uuid;
begin
  v_admin_id := coalesce(p_admin_id, public.current_admin_id());

  update public.registrations
  set
    hidden_from_web = true,
    deleted_by = v_admin_id,
    deleted_at = now(),
    updated_at = now()
  where id = p_registration_id
  returning * into v_reg;

  if not found then
    raise exception 'Registration with ID % not found.', p_registration_id;
  end if;

  return v_reg;
end;
$$;

-- D. REJECT RECOVERY ENGINE: Detects ~90% matching previously rejected entries
-- Used before creating a new registration to warn student and auto-fill previous data.
create or replace function public.find_rejected_registration_recovery(
  p_student_name text,
  p_college_id text,
  p_roll text,
  p_group text default null,
  p_section text default null
)
returns table (
  match_confidence numeric,
  id uuid,
  registration_no text,
  student_name text,
  college_id text,
  roll text,
  "group" text,
  section text,
  gender text,
  photo_url text,
  jersey_name text,
  jersey_number text,
  jersey_size text,
  payment_method text,
  sender_number text,
  payment_time text,
  transaction_id text,
  status text,
  reject_reason text,
  rejected_at timestamptz
)
language plpgsql
security definer
stable
as $$
begin
  return query
  select
    case
      -- 100% exact match on College ID
      when lower(trim(r.college_id)) = lower(trim(p_college_id)) then 1.00
      -- 95% match on Roll + Student Name
      when lower(trim(r.roll)) = lower(trim(p_roll))
       and lower(trim(r.student_name)) = lower(trim(p_student_name)) then 0.95
      -- 90% match on Roll + Group + Section
      when lower(trim(r.roll)) = lower(trim(p_roll))
       and lower(trim(r."group")) = lower(trim(coalesce(p_group, r."group")))
       and lower(trim(r.section)) = lower(trim(coalesce(p_section, r.section))) then 0.90
      else 0.85
    end as match_confidence,
    r.id,
    r.registration_no,
    r.student_name,
    r.college_id,
    r.roll,
    r."group",
    r.section,
    r.gender,
    r.photo_url,
    r.jersey_name,
    r.jersey_number,
    r.jersey_size,
    r.payment_method,
    r.sender_number,
    r.payment_time,
    r.transaction_id,
    r.status,
    r.reject_reason,
    r.rejected_at
  from public.registrations r
  where r.status = 'rejected'
    and r.hidden_from_web = false
    and (
      (p_college_id is not null and lower(trim(r.college_id)) = lower(trim(p_college_id)))
      or
      (p_roll is not null and p_student_name is not null
       and lower(trim(r.roll)) = lower(trim(p_roll))
       and lower(trim(r.student_name)) = lower(trim(p_student_name)))
      or
      (p_roll is not null and p_section is not null
       and lower(trim(r.roll)) = lower(trim(p_roll))
       and lower(trim(r.section)) = lower(trim(p_section)))
    )
  order by match_confidence desc, r.rejected_at desc
  limit 1;
end;
$$;

-- E. INVITATION CARD VERIFICATION & LOOKUP API
-- Evaluates status and returns download authorization or informative status messages:
--   - Approved -> Card download available
--   - Pending -> Under review message
--   - Rejected -> Displays reject reason
--   - Hidden -> Not available
create or replace function public.lookup_invitation_card(
  p_registration_no text,
  p_student_name text default null
)
returns jsonb
language plpgsql
security definer
stable
as $$
declare
  v_reg public.registrations;
  v_clean_reg text;
  v_clean_name text;
begin
  v_clean_reg := upper(trim(p_registration_no));
  v_clean_name := lower(trim(coalesce(p_student_name, '')));

  select *
  into v_reg
  from public.registrations
  where (
    registration_no = v_clean_reg
    or registration_no ilike '%' || v_clean_reg || '%'
    or college_id ilike v_clean_reg
    or roll = v_clean_reg
  )
  and (
    v_clean_name = ''
    or lower(student_name) ilike '%' || v_clean_name || '%'
  )
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object(
      'found', false,
      'message', 'No registration found for the provided details.'
    );
  end if;

  -- 1. Hidden from web check
  if v_reg.hidden_from_web = true then
    return jsonb_build_object(
      'found', false,
      'status', 'hidden',
      'message', 'This registration is no longer available on the website portal.'
    );
  end if;

  -- 2. Approved Status: Full Invitation Card Download Authorization
  if v_reg.status = 'approved' then
    return jsonb_build_object(
      'found', true,
      'status', 'approved',
      'can_download', true,
      'registration_no', v_reg.registration_no,
      'student_name', v_reg.student_name,
      'college_id', v_reg.college_id,
      'roll', v_reg.roll,
      'group', v_reg."group",
      'section', v_reg.section,
      'gender', v_reg.gender,
      'photo_url', v_reg.photo_url,
      'jersey_name', v_reg.jersey_name,
      'jersey_number', v_reg.jersey_number,
      'jersey_size', v_reg.jersey_size,
      'approved_at', v_reg.approved_at,
      'message', 'Registration approved. Your invitation card is ready for download.'
    );
  end if;

  -- 3. Pending Status: Informative message
  if v_reg.status = 'pending' then
    return jsonb_build_object(
      'found', true,
      'status', 'pending',
      'can_download', false,
      'registration_no', v_reg.registration_no,
      'student_name', v_reg.student_name,
      'message', 'Your registration is currently under review by the administration.'
    );
  end if;

  -- 4. Rejected Status: Displays exact reject reason
  if v_reg.status = 'rejected' then
    return jsonb_build_object(
      'found', true,
      'status', 'rejected',
      'can_download', false,
      'registration_no', v_reg.registration_no,
      'student_name', v_reg.student_name,
      'reject_reason', v_reg.reject_reason,
      'rejected_at', v_reg.rejected_at,
      'can_register_again', true,
      'message', 'Your registration was rejected. Please review the reason and submit corrections.'
    );
  end if;

  return jsonb_build_object(
    'found', false,
    'message', 'Status unknown.'
  );
end;
$$;

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- Enforces complete server-side security. Never trusts frontend role checks.
-- Rules:
--   - Male Admin: Access only to gender = 'male'
--   - Female Admin: Access only to gender = 'female'
--   - No cross-access between admins.
--   - Public/Students: Can create registrations and query visible records.
alter table public.registrations enable row level security;

-- Drop any previous conflicting policies
drop policy if exists "students_insert_pending" on public.registrations;
drop policy if exists "public_select_visible" on public.registrations;
drop policy if exists "students_resubmit_rejected" on public.registrations;
drop policy if exists "male_admin_select_male" on public.registrations;
drop policy if exists "male_admin_update_male" on public.registrations;
drop policy if exists "male_admin_delete_male" on public.registrations;
drop policy if exists "female_admin_select_female" on public.registrations;
drop policy if exists "female_admin_update_female" on public.registrations;
drop policy if exists "female_admin_delete_female" on public.registrations;
drop policy if exists "service_role_all_registrations" on public.registrations;

-- A. STUDENT POLICIES (Anon & Authenticated)

-- A1. Public Insertion: Students submit new registrations in 'pending' state
create policy "students_insert_pending" on public.registrations
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and hidden_from_web = false
  );

-- A2. Public Selection: Required for Duplicate Detection and Status Verification
create policy "public_select_visible" on public.registrations
  for select
  to anon, authenticated
  using (
    hidden_from_web = false
  );

-- A3. Student Re-submission: Allows editing rejected registration without changing registration_no
create policy "students_resubmit_rejected" on public.registrations
  for update
  to anon, authenticated
  using (
    status = 'rejected'
    and hidden_from_web = false
  )
  with check (
    status = 'pending'
  );

-- B. MALE ADMIN ISOLATION POLICIES (role = 'male_admin')
-- Exclusively manages Male registrations (gender = 'male')

create policy "male_admin_select_male" on public.registrations
  for select
  to authenticated
  using (
    public.current_admin_role() = 'male_admin'
    and gender = 'male'
  );

create policy "male_admin_update_male" on public.registrations
  for update
  to authenticated
  using (
    public.current_admin_role() = 'male_admin'
    and gender = 'male'
  )
  with check (
    public.current_admin_role() = 'male_admin'
    and gender = 'male'
  );

create policy "male_admin_delete_male" on public.registrations
  for delete
  to authenticated
  using (
    public.current_admin_role() = 'male_admin'
    and gender = 'male'
  );

-- C. FEMALE ADMIN ISOLATION POLICIES (role = 'female_admin')
-- Exclusively manages Female registrations (gender = 'female')

create policy "female_admin_select_female" on public.registrations
  for select
  to authenticated
  using (
    public.current_admin_role() = 'female_admin'
    and gender = 'female'
  );

create policy "female_admin_update_female" on public.registrations
  for update
  to authenticated
  using (
    public.current_admin_role() = 'female_admin'
    and gender = 'female'
  )
  with check (
    public.current_admin_role() = 'female_admin'
    and gender = 'female'
  );

create policy "female_admin_delete_female" on public.registrations
  for delete
  to authenticated
  using (
    public.current_admin_role() = 'female_admin'
    and gender = 'female'
  );

-- D. SERVICE ROLE POLICY (Full privileges for maintenance & automation)
create policy "service_role_all_registrations" on public.registrations
  for all
  to service_role
  using (true)
  with check (true);

-- 10. REAL-TIME SUBSCRIPTION PUBLICATION
-- Enables live instant updates on admin dashboards
do $$
begin
  alter publication supabase_realtime add table public.registrations;
exception when others then null;
end $$;

-- 11. GRANT PRIVILEGES
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update on public.registrations to anon, authenticated;
grant all on public.registrations to service_role;
grant usage, select on sequence public.registration_sl_seq to anon, authenticated, service_role;
grant usage, select on sequence public.male_reg_seq to anon, authenticated, service_role;
grant usage, select on sequence public.female_reg_seq to anon, authenticated, service_role;

grant execute on function public.approve_registration(uuid, uuid) to authenticated, service_role;
grant execute on function public.reject_registration(uuid, text, uuid) to authenticated, service_role;
grant execute on function public.hide_registration_from_web(uuid, uuid) to authenticated, service_role;
grant execute on function public.find_rejected_registration_recovery(text, text, text, text, text) to anon, authenticated, service_role;
grant execute on function public.lookup_invitation_card(text, text) to anon, authenticated, service_role;

-- End of registrations.sql
