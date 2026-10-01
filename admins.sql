-- ============================================================================
-- RAG DAY 27 (RD27) - PRODUCTION DATABASE ARCHITECTURE: FILE 1 of 2
-- FILE: admins.sql
-- TARGET PROJECT REF: xulkacnjqjnluhmbqbcu
-- SUPABASE URL: https://xulkacnjqjnluhmbqbcu.supabase.co
-- ============================================================================
-- GOAL:
-- Clean, isolated, production-grade Administrator Management Architecture.
-- Exclusively supports TWO roles:
--   1. 'male_admin'   (Male Administrator - Boys Wing)
--   2. 'female_admin' (Female Administrator - Girls Wing)
--
-- No Super Admin table. No site configuration tables.
-- Linked directly to Supabase auth.users for identity authentication.
-- ============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. CLEANUP LEGACY OBJECTS (Idempotent Migration)
drop trigger if exists trg_admins_updated_at on public.admins;
drop function if exists public.fn_admins_set_updated_at();

-- 3. CREATE ADMINS TABLE
-- Fields: id, auth_user_id, full_name, role, active, created_at, updated_at
create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('male_admin', 'female_admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Comment on table and columns for documentation
comment on table public.admins is 'Authorized administrators (male_admin and female_admin) for Rag Day 27';
comment on column public.admins.id is 'Primary unique UUID identifier for internal admin foreign keys';
comment on column public.admins.auth_user_id is 'Direct foreign key reference to Supabase auth.users';
comment on column public.admins.role is 'Admin scope: strictly male_admin or female_admin';
comment on column public.admins.active is 'Flag indicating if admin permissions are currently enabled';

-- 4. PERFORMANCE & LOOKUP INDEXES
create index if not exists idx_admins_auth_user_id on public.admins(auth_user_id);
create index if not exists idx_admins_role on public.admins(role);
create index if not exists idx_admins_active on public.admins(active);
create index if not exists idx_admins_role_active on public.admins(role, active);

-- 5. UPDATED_AT TRIGGER FUNCTION
create or replace function public.fn_admins_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_admins_updated_at
  before update on public.admins
  for each row
  execute function public.fn_admins_set_updated_at();

-- 6. SECURITY DEFINER HELPER FUNCTIONS
-- These functions run with elevated privileges to check current admin credentials
-- safely inside PostgreSQL RLS policies without recursive policy execution.

-- A. Returns current authenticated user's admin role ('male_admin', 'female_admin', or null)
create or replace function public.current_admin_role()
returns text
language sql
security definer
set search_path = public, auth
stable
as $$
  select role
  from public.admins
  where auth_user_id = auth.uid()
    and active = true
  limit 1;
$$;

-- B. Returns current authenticated user's admin table UUID id
create or replace function public.current_admin_id()
returns uuid
language sql
security definer
set search_path = public, auth
stable
as $$
  select id
  from public.admins
  where auth_user_id = auth.uid()
    and active = true
  limit 1;
$$;

-- C. Returns true if current authenticated user is an active male admin
create or replace function public.is_male_admin()
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1
    from public.admins
    where auth_user_id = auth.uid()
      and role = 'male_admin'
      and active = true
  );
$$;

-- D. Returns true if current authenticated user is an active female admin
create or replace function public.is_female_admin()
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1
    from public.admins
    where auth_user_id = auth.uid()
      and role = 'female_admin'
      and active = true
  );
$$;

-- E. Returns true if current authenticated user is any active admin
create or replace function public.is_active_admin()
returns boolean
language sql
security definer
set search_path = public, auth
stable
as $$
  select exists (
    select 1
    from public.admins
    where auth_user_id = auth.uid()
      and active = true
  );
$$;

-- F. Safe provisioning procedure for project setup/migration
create or replace function public.provision_admin_user(
  p_auth_user_id uuid,
  p_full_name text,
  p_role text
)
returns public.admins
language plpgsql
security definer
as $$
declare
  v_admin public.admins;
begin
  if p_role not in ('male_admin', 'female_admin') then
    raise exception 'Invalid role: %. Only male_admin or female_admin are permitted.', p_role;
  end if;

  insert into public.admins (auth_user_id, full_name, role, active)
  values (p_auth_user_id, p_full_name, p_role, true)
  on conflict (auth_user_id) do update set
    full_name = excluded.full_name,
    role = excluded.role,
    active = true,
    updated_at = now()
  returning * into v_admin;

  return v_admin;
end;
$$;

-- 7. ROW LEVEL SECURITY (RLS)
alter table public.admins enable row level security;

-- Policy 1: Authenticated admin can read their own profile
drop policy if exists "admins_select_own" on public.admins;
create policy "admins_select_own" on public.admins
  for select
  to authenticated
  using (auth.uid() = auth_user_id);

-- Policy 2: Active admins can view list of admins (for team directory/dashboard context)
drop policy if exists "admins_select_active_colleagues" on public.admins;
create policy "admins_select_active_colleagues" on public.admins
  for select
  to authenticated
  using (public.is_active_admin());

-- Policy 3: Service role full access for backend scripts / Supabase Studio
drop policy if exists "admins_service_role_all" on public.admins;
create policy "admins_service_role_all" on public.admins
  for all
  to service_role
  using (true)
  with check (true);

-- 8. GRANT PRIVILEGES
grant usage on schema public to anon, authenticated, service_role;
grant select on public.admins to authenticated, anon;
grant execute on function public.current_admin_role() to authenticated, anon;
grant execute on function public.current_admin_id() to authenticated, anon;
grant execute on function public.is_male_admin() to authenticated, anon;
grant execute on function public.is_female_admin() to authenticated, anon;
grant execute on function public.is_active_admin() to authenticated, anon;
grant execute on function public.provision_admin_user(uuid, text, text) to authenticated, service_role;

-- End of admins.sql
