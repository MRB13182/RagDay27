-- Persistent site configuration storage for Super Admin settings
-- Stores header ticker notices, popup news slideshow items, registration sections,
-- countdown configuration, event cards, and website identity settings.

create table if not exists public.site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

grant usage on schema public to anon, authenticated, service_role;
revoke all on table public.site_settings from anon;
grant select on table public.site_settings to anon, authenticated;
grant select, insert, update, delete on table public.site_settings to service_role;

drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings"
  on public.site_settings
  for select
  to anon, authenticated
  using (true);

create or replace function public.get_site_settings()
returns table (setting_key text, setting_value text, updated_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  select s.key, s.value, s.updated_at
  from public.site_settings s
  order by s.key asc;
$$;

create or replace function public.save_super_admin_text(
  p_path text,
  p_content text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_key text := regexp_replace(coalesce(p_path, ''), '^src/super-admin/', '');
begin
  clean_key := ltrim(trim(clean_key), '/');
  if clean_key = '' then
    raise exception 'SETTING_KEY_REQUIRED';
  end if;

  insert into public.site_settings (key, value, updated_at)
  values (clean_key, coalesce(p_content, ''), now())
  on conflict (key) do update
    set value = excluded.value,
        updated_at = now();
end;
$$;

grant execute on function public.get_site_settings() to anon, authenticated, service_role;
grant execute on function public.save_super_admin_text(text, text) to anon, authenticated, service_role;
