-- RagDay27 canonical admins database contract
-- Supabase project ref: xulkacnjqjnluhmbqbcu
-- Exactly two production roles: male_admin and female_admin.
-- Actual auth_user_id values must be populated only from real auth.users identities.

create extension if not exists pgcrypto;

create table if not exists public.admins (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('male_admin','female_admin')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists admins_role_unique on public.admins(role);

alter table public.admins enable row level security;

-- Supabase permissions
grant usage on schema public to anon, authenticated, service_role;
grant select on table public.admins to anon, authenticated, service_role;

-- RLS policies
drop policy if exists "Allow read admins" on public.admins;
create policy "Allow read admins"
  on public.admins
  for select
  to anon, authenticated, service_role
  using (true);
