-- Additive registration-edit schema only; existing registration data and RPCs remain untouched.
alter table public.registrations
  add column if not exists edit_count integer not null default 0 check (edit_count between 0 and 5),
  add column if not exists edit_locked boolean not null default false,
  add column if not exists last_edited_at timestamptz,
  add column if not exists last_edit_source text;

create table if not exists public.registration_edit_settings (
  singleton boolean primary key default true check (singleton),
  edit_deadline timestamptz not null default '2026-12-01 23:59:59+06',
  rejected_editable_fields text[] not null default array[]::text[],
  updated_at timestamptz not null default now()
);
insert into public.registration_edit_settings(singleton,edit_deadline)
values(true,'2026-12-01 23:59:59+06') on conflict(singleton) do nothing;
alter table public.registration_edit_settings enable row level security;
revoke all on public.registration_edit_settings from public,anon,authenticated;
grant select,insert,update on public.registration_edit_settings to service_role;

create schema if not exists private;
create table if not exists private.registration_edit_sessions (
  token_hash text primary key,
  registration_id uuid not null references public.registrations(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists registration_edit_sessions_expires_at_idx
  on private.registration_edit_sessions(expires_at);
alter table private.registration_edit_sessions enable row level security;
revoke all on private.registration_edit_sessions from public,anon,authenticated;
grant all on private.registration_edit_sessions to service_role;
